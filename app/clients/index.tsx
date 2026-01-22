import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, SafeAreaView } from 'react-native';
import { Search, ChevronRight, AlertCircle, CheckCircle, Wallet, UserPlus, X, Filter, Trash2, Edit2 } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Client, Sale } from '../../types';
import { db } from '../../services/db';

export default function ClientsScreen() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    
    // Filter State
    const [filterTab, setFilterTab] = useState<'ALL' | 'LATE' | 'PENDING' | 'PAID'>('ALL');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    const loadData = async () => {
        try {
            const [allClients, allSales] = await Promise.all([
                db.getClients(),
                db.getSales()
            ]);

            const enriched = allClients.map(c => {
                const clientSales = allSales.filter(s => s.clientId === c.id && s.remainingBalance > 0);
                let oldestDebtDays = 0;
                if (clientSales.length > 0) {
                    const oldestDate = clientSales.reduce((oldest, current) => {
                        return new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest;
                    }).timestamp;
                    const diffTime = Math.abs(Date.now() - new Date(oldestDate).getTime());
                    oldestDebtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
                return { ...c, oldestDebtDays };
            });
            setClients(enriched);
        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao carregar clientes");
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
            case 'LATE': return 'Atrasados (>30d)';
            case 'PENDING': return 'Pendentes';
            case 'PAID': return 'Em Dia';
            default: return 'Filtros';
        }
    };

    const renderClientItem = ({ item }: { item: Client }) => {
        let status = 'Em dia';
        let statusStyle = styles.badgeGreen;
        let statusTextOpen = styles.textGreen;
        
        if (item.oldestDebtDays && item.oldestDebtDays > 30) {
            status = `Atrasado ${item.oldestDebtDays} dias`;
            statusStyle = styles.badgeRed;
            statusTextOpen = styles.textRed;
        } else if (item.totalDebt > 0) {
            status = `Pendente ${item.oldestDebtDays || 1} dias`;
            statusStyle = styles.badgeOrange;
            statusTextOpen = styles.textOrange;
        }

        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => router.push({ pathname: '/clients/[id]', params: { id: item.id } })}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.clientName}>{item.name}</Text>
                        <View style={styles.badgesRow}>
                            <View style={[styles.badge, statusStyle]}>
                                <Text style={[styles.badgeText, statusTextOpen]}>{status}</Text>
                            </View>
                            {item.credit > 0 && (
                                <View style={[styles.badge, styles.badgeBlue]}>
                                    <Text style={[styles.badgeText, styles.textBlue]}>
                                        Crédito: {formatCurrency(item.credit)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <ChevronRight size={20} color="#ccc" />
                </View>
                
                <View style={styles.cardFooter}>
                    <View style={styles.debtContainer}>
                        <Text style={styles.debtLabel}>Deve</Text>
                        <Text style={[styles.debtValue, item.totalDebt > 0 ? styles.textRed : styles.textGreen]}>
                            {formatCurrency(item.totalDebt)}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.editBtn}
                        onPress={(e) => {
                            // Prevent bubbling if possible, though in RN standard touchables handle this differently
                            // Here we just navigate to edit page
                            router.push({ pathname: '/clients/new', params: { id: item.id } });
                        }}
                    >
                        <Edit2 size={18} color="#9ca3af" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Meus Clientes</Text>
                <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => router.push('/clients/new')}
                >
                    <UserPlus size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

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

            {/* Filter Modal */}
            <Modal
                visible={isFilterModalOpen}
                transparent={true}
                animationType="slide"
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
                                <Text style={[styles.filterText, filterTab === 'PAID' && styles.filterTextActive]}>Em Dia (Sem dívida)</Text>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
    addBtn: {
        backgroundColor: '#203A43',
        padding: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchContainer: {
        marginHorizontal: 24,
        marginBottom: 16,
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
    },
    filterBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    filterBtnText: { fontWeight: 'bold', color: '#4B5563' },

    listContent: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    clientName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
    badgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    
    badgeGreen: { backgroundColor: '#DCFCE7' }, 
    textGreen: { color: '#15803D' },
    badgeRed: { backgroundColor: '#FEE2E2' },
    textRed: { color: '#B91C1C' },
    badgeOrange: { backgroundColor: '#FFEDD5' },
    textOrange: { color: '#C2410C' },
    badgeBlue: { backgroundColor: '#DBEAFE' },
    textBlue: { color: '#1D4ED8' },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
    debtContainer: { alignItems: 'flex-start' },
    debtLabel: { fontSize: 12, color: '#6B7280' },
    debtValue: { fontSize: 16, fontWeight: 'bold' },
    editBtn: { padding: 4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    filterOptions: { gap: 12 },
    filterOption: { padding: 16, backgroundColor: '#F3F4F6', borderRadius: 12 },
    filterOptionActive: { backgroundColor: '#203A43' },
    filterText: { fontWeight: 'bold', color: '#4B5563' },
    filterTextActive: { color: '#FFF' },
});
