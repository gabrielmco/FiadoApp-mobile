import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, SafeAreaView, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ChevronRight, Plus, Filter, X, Edit2, MessageCircle, Wallet } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Client } from '../../types';
import { db } from '../../services/db';

export default function ClientsScreen() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');

    // Filter State
    const [filterTab, setFilterTab] = useState<'ALL' | 'LATE' | 'PENDING' | 'PAID'>('ALL');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Motor de Enriquecimento de Dados
    const loadData = async () => {
        try {
            const [allClients, allSales] = await Promise.all([
                db.getClients(),
                db.getSales()
            ]);

            const enriched = allClients.map(c => {
                // Filtra apenas vendas pendentes deste cliente
                const clientSales = allSales.filter(s => s.clientId === c.id && s.remainingBalance > 0);

                let oldestDebtDays = 0;

                if (clientSales.length > 0) {
                    // Encontra a data mais antiga
                    const oldestDate = clientSales.reduce((oldest, current) => {
                        return new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest;
                    }).timestamp;

                    const diffTime = Math.abs(Date.now() - new Date(oldestDate).getTime());
                    oldestDebtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                return { ...c, oldestDebtDays };
            });

            // Ordena: Quem deve há mais tempo aparece primeiro
            enriched.sort((a, b) => (b.oldestDebtDays || 0) - (a.oldestDebtDays || 0));

            setClients(enriched);
        } catch (e) {
            console.error(e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const filtered = useMemo(() => {
        return clients.filter(c => {
            const matchesName = c.name.toLowerCase().includes(search.toLowerCase());
            if (!matchesName) return false;

            if (filterTab === 'LATE') return (c.oldestDebtDays || 0) > 30 && c.totalDebt > 0;
            if (filterTab === 'PENDING') return (c.oldestDebtDays || 0) <= 30 && c.totalDebt > 0;
            if (filterTab === 'PAID') return c.totalDebt === 0;
            return true;
        });
    }, [clients, search, filterTab]);

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const getFilterLabel = (tab: string) => {
        switch (tab) {
            case 'ALL': return 'Todos';
            case 'LATE': return 'Atrasados';
            case 'PENDING': return 'Pendentes';
            case 'PAID': return 'Em Dia';
            default: return 'Filtros';
        }
    };

    const handleChargeClient = async (client: Client) => {
        // 1. Check Phone
        let phone = client.phone ? client.phone.replace(/\D/g, '') : '';

        if (!phone || phone.length < 10) {
            Alert.alert(
                "Sem Telefone",
                "Este cliente não possui um telefone válido cadastrado. Deseja adicionar agora?",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Adicionar",
                        onPress: () => router.push({ pathname: '/clients/[id]', params: { id: client.id } }) // Redirect to details to edit
                    }
                ]
            );
            return;
        }

        // 2. Find Oldest Unpaid Sale for Context
        try {
            const clientSales = await db.getClientSales(client.id);
            const unpaidSales = clientSales.filter(s => s.remainingBalance > 0);

            // Sort by date ascending (oldest first)
            unpaidSales.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const oldestSale = unpaidSales[0];
            const purchaseDate = oldestSale ? new Date(oldestSale.timestamp).toLocaleDateString('pt-BR') : 'data desconhecida';

            const dueDateObj = new Date(oldestSale ? oldestSale.timestamp : new Date());
            dueDateObj.setDate(dueDateObj.getDate() + 30);
            const dueDate = dueDateObj.toLocaleDateString('pt-BR');

            // 3. Build Message
            const message = `Olá *${client.name}*! 👋

Consta em nosso sistema uma pendência de *${formatCurrency(client.totalDebt)}*.

Referente à compra do dia *${purchaseDate}* (Vencimento: *${dueDate}*).

Podemos agendar o pagamento?

_Mensagem automática - Gestor de Vendas_`;

            // 4. Open WhatsApp
            if (phone.length <= 11) phone = '55' + phone;
            const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Erro", "WhatsApp não está instalado.");
            }

        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao preparar mensagem de cobrança.");
        }
    };

    const renderClientItem = ({ item }: { item: Client }) => {
        let status = 'Em dia';
        let statusColor = '#16A34A'; // Green
        let statusBg = '#DCFCE7';

        if (item.totalDebt > 0) {
            if ((item.oldestDebtDays || 0) > 30) {
                status = `Atrasado há ${item.oldestDebtDays} dias`;
                statusColor = '#DC2626'; // Red
                statusBg = '#FEE2E2';
            } else {
                status = `Pendente há ${item.oldestDebtDays || 1} dias`;
                statusColor = '#D97706'; // Orange
                statusBg = '#FFEDD5';
            }
        }

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/clients/[id]', params: { id: item.id } })}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.clientName}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            {item.totalDebt > 0 ? (
                                <View style={[styles.badge, { backgroundColor: statusBg }]}>
                                    <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
                                </View>
                            ) : (
                                <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                                    <Text style={[styles.badgeText, { color: '#16A34A' }]}>Em dia</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.debtLabel}>Saldo</Text>
                        <Text style={[styles.debtValue, { color: item.totalDebt > 0 ? '#DC2626' : '#16A34A' }]}>
                            {formatCurrency(item.totalDebt)}
                        </Text>
                    </View>
                </View>

                {item.totalDebt > 0 && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.chargeButton}
                            onPress={() => router.push({ pathname: '/clients/[id]', params: { id: item.id } })}
                        >
                            <Wallet size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.chargeButtonText}>VER CARTEIRA</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Limpo (Sem botão de adicionar) */}
            <LinearGradient
                colors={['#0F2027', '#203A43', '#2C5364']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <SafeAreaView>
                    <Text style={styles.title}>Meus Clientes</Text>
                </SafeAreaView>
            </LinearGradient>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* Filter Toggle */}
            <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setIsFilterModalOpen(true)}
            >
                <View style={styles.filterBtnContent}>
                    <Filter size={18} color="#4B5563" />
                    <Text style={styles.filterBtnText}>{getFilterLabel(filterTab)}</Text>
                </View>
            </TouchableOpacity>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                renderItem={renderClientItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Nenhum cliente encontrado.</Text>
                }
            />

            {/* FAB - Floating Action Button (Botão Flutuante) */}
            <TouchableOpacity
                style={styles.fabContainer}
                activeOpacity={0.8}
                onPress={() => router.push('/clients/new')}
            >
                <LinearGradient
                    colors={['#0F2027', '#203A43', '#2C5364']}
                    style={styles.fabGradient}
                >
                    <Plus size={32} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Filter Modal */}
            <Modal
                visible={isFilterModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsFilterModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filtrar Clientes</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                                <X size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.filterOptions}>
                            <TouchableOpacity
                                style={[styles.filterOption, filterTab === 'ALL' && styles.filterOptionActive]}
                                onPress={() => { setFilterTab('ALL'); setIsFilterModalOpen(false); }}
                            >
                                <Text style={[styles.filterText, filterTab === 'ALL' && styles.filterTextActive]}>Todos</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterTab === 'LATE' && styles.filterOptionActive]}
                                onPress={() => { setFilterTab('LATE'); setIsFilterModalOpen(false); }}
                            >
                                <Text style={[styles.filterText, filterTab === 'LATE' && styles.filterTextActive]}>Atrasados {'>'} 30 dias</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterTab === 'PENDING' && styles.filterOptionActive]}
                                onPress={() => { setFilterTab('PENDING'); setIsFilterModalOpen(false); }}
                            >
                                <Text style={[styles.filterText, filterTab === 'PENDING' && styles.filterTextActive]}>Pendentes {'<'} 30 dias</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterTab === 'PAID' && styles.filterOptionActive]}
                                onPress={() => { setFilterTab('PAID'); setIsFilterModalOpen(false); }}
                            >
                                <Text style={[styles.filterText, filterTab === 'PAID' && styles.filterTextActive]}>Em Dia (R$ 0,00)</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 60 : 20,
        paddingBottom: 30,
        // backgroundColor is handled by gradient
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    title: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },

    // FAB Styles
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        borderRadius: 32,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 10
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },

    searchContainer: {
        marginHorizontal: 24,
        marginVertical: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: '100%', fontSize: 16, color: '#1F2937' },

    filterBtn: {
        marginHorizontal: 24,
        marginBottom: 16,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignSelf: 'flex-start'
    },
    filterBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterBtnText: { fontWeight: 'bold', color: '#4B5563' },

    listContent: { paddingHorizontal: 24, paddingBottom: 100, gap: 12 },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    clientName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    badgesRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: 'bold' },

    cardActions: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    chargeButton: {
        backgroundColor: '#203A43',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 12,
        shadowColor: '#203A43',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    chargeButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },

    debtContainer: { alignItems: 'flex-end' },
    debtLabel: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 },
    debtValue: { fontSize: 18, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    filterOptions: { gap: 12 },
    filterOption: { padding: 16, backgroundColor: '#F3F4F6', borderRadius: 12 },
    filterOptionActive: { backgroundColor: '#203A43' },
    filterText: { fontWeight: 'bold', color: '#4B5563', fontSize: 16 },
    filterTextActive: { color: '#FFF' },
});