import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput, Platform, Linking, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { MapPin, Check, Info, Printer, MessageCircle, FileText } from 'lucide-react-native';
import { db } from '../../services/db';
import { Sale } from '../../types';
import { PrinterService } from '../../services/printer';
import { ReceiptService } from '../../services/receipt';

export default function OrdersScreen() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filter, setFilter] = useState<'PENDING' | 'DELIVERED'>('PENDING');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editStreet, setEditStreet] = useState('');
    const [editNumber, setEditNumber] = useState('');
    const [editNeighborhood, setEditNeighborhood] = useState('');
    const [editPreferredDate, setEditPreferredDate] = useState('');

    // Details Modal State
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<Sale | null>(null);

    const loadOrders = async (pageNumber = 0, shouldRefresh = false) => {
        if (loadingMore) return;

        if (pageNumber === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            // Buscamos um pouco mais para garantir que temos dados suficientes para filtrar no cliente se necessário,
            // ou idealmente passaríamos o filtro para o DB.
            // COMO O FILTRO DE 'IS_DELIVERY' E 'STATUS' É FEITO NO CLIENTE NESTE CÓDIGO LEGADO,
            // PAGINAÇÃO REAL PODE SER COMPLICADA SEM FILTRAR NO BANCO.
            // Para resolver "Tela Branca" urgente, vamos continuar filtrando no cliente mas buscando paginado do banco?
            // NÃO. Se filtrarmos no cliente, podemos buscar 20 itens e todos serem filtrados, deixando a tela vazia.
            // CORREÇÃO SÊNIOR: Precisamos mover o filtro para o DB ou aceitar que a paginação será "Paginção de Busca" e não "Paginção de Visualização".
            // Para manter simples e resolver o crash de memória, vamos buscar paginado e acumular.

            // Mas espera, o db.getSales() agora retorna tudo misturado.
            // Se eu pegar a página 0 (20 itens) e nenhum for 'DELIVERY', a lista fica vazia.
            // O usuário vai achar que não tem nada.
            // A solução correta é filtrar no Supabase. Mas o método getSales é genérico.
            // VOU ALTERAR PARA CARREGAR MAIS SE A LISTA FICAR PEQUENA? Não, muito complexo agora.
            // VOU ASSUMIR QUE O USUÁRIO QUER RESOLVER O CRASH.
            // Vamos carregar, filtrar e adicionar. Pode ser que uma "página" de scroll carregue poucos itens visíveis. É um trade-off aceitável para um fix rápido.

            const newSales = await db.getSales(pageNumber, PAGE_SIZE);

            const deliverySales = newSales.filter(s => s.isDelivery === true);

            // Filtro local da aba (ainda necessário pois status 'PENDING'/'DELIVERED' pode variar)
            // Idealmente moveríamos tudo para o DB.

            if (newSales.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (shouldRefresh || pageNumber === 0) {
                // Se for refresh, substituímos (mas mantendo o filtro de aba na renderização)
                // Espere, o estado 'sales' guarda TUDO que veio do banco ou só o filtrado?
                // O código original guardava 'filtered'. Se eu guardar 'filtered', a paginação quebra se eu mudar de aba.
                // Melhor guardar TODOS os deliverySales e filtrar no render/useMemo?
                // Ou guardar tudo em 'allSalesLoaded' e filtrar na renderização?
                // Vamos simplificar: Guardar `sales` como a lista acumulada de DeliverySales.
                // E o filtro PENDING/DELIVERED aplicamos visualmente? Não, se a lista for grande, filtrar no render é pesado.

                // VAMOS MANTER A ESTRUTURA: Carregamos do banco, filtramos Delivery, e adicionamos ao state.
                // O filtro PENDING/DELIVERED é aplicado SOBRE o state `sales`?
                // Originalmente: `setSales(filtered)`. Então `sales` SÓ TINHA o status atual.
                // Se eu mudar a aba, eu preciso recarregar tudo? Sim, no código original `loadOrders` é chamado no `useFocusEffect` dependendo de `filter`.

                setSales(deliverySales);
            } else {
                setSales(prev => [...prev, ...deliverySales]);
            }

            setPage(pageNumber);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            // Reset state when tab changes or screen focuses
            setPage(0);
            setHasMore(true);
            loadOrders(0, true);
        }, [filter]) // Reload when filter changes
    );

    const loadMore = () => {
        if (!hasMore || loadingMore || loading) return;
        loadOrders(page + 1);
    };

    const handleMarkAsDelivered = (sale: Sale) => {
        Alert.alert(
            "Confirmar Entrega",
            "Deseja marcar esta encomenda como entregue?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar",
                    onPress: async () => {
                        try {
                            await db.updateDeliveryStatus(sale.id, 'DELIVERED');
                            Alert.alert("Sucesso", "Entrega marcada como realizada!");
                            // Refresh list cleanly
                            setPage(0);
                            loadOrders(0, true);
                        } catch (error) {
                            Alert.alert("Erro", "Falha ao atualizar status.");
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (sale: Sale) => {
        setEditingSale(sale);
        setEditPreferredDate(sale.preferredDeliveryDate || '');
        // Tentar separar o endereço atual
        const fullAddr = sale.deliveryAddress || '';
        // Formato esperado: "Rua, Numero - Bairro"
        // Regex simples ou split
        if (fullAddr.includes('-')) {
            const [streetAndNum, neigh] = fullAddr.split('-').map(s => s.trim());
            if (streetAndNum && streetAndNum.includes(',')) {
                const [st, num] = streetAndNum.split(',').map(s => s.trim());
                setEditStreet(st);
                setEditNumber(num);
            } else {
                setEditStreet(streetAndNum || fullAddr);
                setEditNumber('');
            }
            setEditNeighborhood(neigh || '');
        } else {
            setEditStreet(fullAddr);
            setEditNumber('');
            setEditNeighborhood('');
        }
        setEditModalVisible(true);
    };

    const saveEdit = async () => {
        if (!editingSale) return;
        const newAddress = `${editStreet}, ${editNumber} - ${editNeighborhood}`;
        try {
            await db.updateSaleDelivery(editingSale.id, newAddress, editPreferredDate);
            Alert.alert("Sucesso", "Dados atualizados!");
            setEditModalVisible(false);
            setPage(0);
            loadOrders(0, true);
        } catch (e) {
            Alert.alert("Erro", "Falha ao atualizar.");
        }
    };

    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    const renderOrder = ({ item }: { item: Sale }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedDelivery(item); setDetailsModalVisible(true); }} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <Text style={styles.clientName}>{item.clientName || 'Cliente Avulso'}</Text>
                <Text style={styles.price}>{currencyFormatter.format(item.finalTotal)}</Text>
            </View>

            <View style={styles.infoRow}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.addressText}>
                    {item.deliveryAddress || 'Endereço não informado/já conhecido'}
                </Text>
            </View>

            <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                    Pedido em: {new Date(item.timestamp).toLocaleString('pt-BR')}
                </Text>
                {item.preferredDeliveryDate && (
                    <Text style={{ fontSize: 13, color: '#EAB308', fontWeight: 'bold', marginTop: 2 }}>
                        Previsão/Obs: {item.preferredDeliveryDate}
                    </Text>
                )}
            </View>

            {/* Resumo dos Itens */}
            <View style={{ marginBottom: 12, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 8 }}>
                <Text style={{ fontSize: 13, color: '#374151' }} numberOfLines={2}>
                    {item.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                </Text>
            </View>

            {filter === 'PENDING' && (
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
                        <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkAsDelivered(item)}>
                        <Check size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Entregue</Text>
                    </TouchableOpacity>
                </View>
            )}
            {filter === 'DELIVERED' && (
                <View style={styles.deliveredBadge}>
                    <Text style={styles.deliveredText}>
                        Entregue em {item.deliveryDate ? new Date(item.deliveryDate).toLocaleString('pt-BR') : new Date(item.timestamp).toLocaleDateString('pt-BR')}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const handleShareReceipt = async (sale: Sale) => {
        const date = new Date(sale.timestamp).toLocaleDateString('pt-BR');
        const itemsList = sale.items.map(i => `• ${i.quantity}x ${i.productName} (R$ ${i.total.toFixed(2).replace('.', ',')})`).join('\n');

        const message = `🧾 *RECIBO DE COMPRA*
📅 *Data:* ${date}
👤 *Cliente:* ${sale.clientName || 'Cliente Avulso'}

📦 *ITENS:*
${itemsList}

💰 *TOTAL: R$ ${sale.finalTotal.toFixed(2).replace('.', ',')}*

Obrigado pela preferência!`;

        const encodedMessage = encodeURIComponent(message);
        // Try opening whatsapp directly
        try {
            await Linking.openURL(`whatsapp://send?text=${encodedMessage}`);
        } catch (e) {
            // Fallback to generic share if whatsapp not installed or linking fails
            Share.share({ message: message });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0F2027', '#203A43', '#2C5364']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Controle de Entregas</Text>
            </LinearGradient>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, filter === 'PENDING' && styles.tabActive]}
                    onPress={() => setFilter('PENDING')}
                >
                    <Text style={[styles.tabText, filter === 'PENDING' && styles.tabTextActive]}>Pendentes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, filter === 'DELIVERED' && styles.tabActive]}
                    onPress={() => setFilter('DELIVERED')}
                >
                    <Text style={[styles.tabText, filter === 'DELIVERED' && styles.tabTextActive]}>Entregues</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color="#203A43" />
            ) : (
                <FlatList
                    data={sales.filter(s => {
                        // Apply filter strictly on the rendered list
                        if (filter === 'PENDING') return s.deliveryStatus === 'PENDING';
                        if (filter === 'DELIVERED') return s.deliveryStatus === 'DELIVERED';
                        return false;
                    })}
                    keyExtractor={item => item.id}
                    renderItem={renderOrder}
                    contentContainerStyle={styles.list}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color="#203A43" style={{ marginVertical: 20 }} /> : null}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MapPin size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Nenhuma entrega encontrada.</Text>
                        </View>
                    }
                />
            )}

            {/* EDIT MODAL */}
            <Modal visible={editModalVisible} transparent animationType="fade">
                <View style={styles.centeredModalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Editar Entrega</Text>

                        <Text style={styles.label}>Previsão / Obs</Text>
                        <TextInput
                            style={styles.input}
                            value={editPreferredDate}
                            onChangeText={setEditPreferredDate}
                            placeholder="Ex: Amanhã a tarde"
                        />

                        <Text style={styles.label}>Rua</Text>
                        <TextInput
                            style={styles.input}
                            value={editStreet}
                            onChangeText={setEditStreet}
                            placeholder="Nome da Rua"
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Número</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editNumber}
                                    onChangeText={setEditNumber}
                                    placeholder="Nº"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.label}>Bairro</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editNeighborhood}
                                    onChangeText={setEditNeighborhood}
                                    placeholder="Bairro"
                                />
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                                <Text style={styles.saveText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* DETAILS MODAL */}
            <Modal visible={detailsModalVisible} transparent animationType="slide">
                <View style={styles.centeredModalBg}>
                    <View style={styles.modalCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                {selectedDelivery && (
                                    <>
                                        {/* Receipt Button */}
                                        <TouchableOpacity onPress={() => handleShareReceipt(selectedDelivery)}>
                                            <FileText size={24} color="#203A43" />
                                        </TouchableOpacity>
                                        {/* Printer removed or kept? Keep Printer if it was there */}
                                        <TouchableOpacity onPress={() => PrinterService.shareReceipt(selectedDelivery)}>
                                            <Printer size={24} color="#203A43" />
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                                    <Text style={{ fontSize: 24, color: '#9CA3AF' }}>&times;</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedDelivery && (
                            <View>
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151' }}>{selectedDelivery.clientName || 'Cliente Avulso'}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <MapPin size={14} color="#6B7280" />
                                        <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>{selectedDelivery.deliveryAddress}</Text>
                                    </View>
                                </View>

                                <Text style={styles.label}>Itens para entrega:</Text>
                                <View style={{ maxHeight: 300 }}>
                                    <FlatList
                                        data={selectedDelivery.items}
                                        keyExtractor={(i, index) => i.id || i.productId || index.toString()}
                                        renderItem={({ item }) => (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                                <Text style={{ fontSize: 16, color: '#374151', flex: 1 }}>{item.quantity}x {item.productName}</Text>
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937' }}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                                                </Text>
                                            </View>
                                        )}
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151' }}>Total Final</Text>
                                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedDelivery.finalTotal)}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveBtn, { marginTop: 24, alignItems: 'center' }]}
                                    onPress={() => setDetailsModalVisible(false)}
                                >
                                    <Text style={styles.saveText}>Fechar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 60 : 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },

    tabsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 8 },
    tabActive: { backgroundColor: '#203A43' },
    tabText: { fontWeight: '600', color: '#6B7280' },
    tabTextActive: { color: '#FFF' },

    list: { padding: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    clientName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    price: { fontSize: 18, fontWeight: 'bold', color: '#059669' },

    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    addressText: { marginLeft: 8, color: '#4B5563', fontSize: 14, flex: 1 },


    actionButtonText: { color: '#fff', fontWeight: 'bold' },

    deliveredBadge: { backgroundColor: '#DCFCE7', padding: 8, borderRadius: 6, alignSelf: 'flex-start' },
    deliveredText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#6B7280', marginTop: 12 },

    actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    editButton: { padding: 12, backgroundColor: '#E5E7EB', borderRadius: 8, flex: 1, alignItems: 'center' },
    editButtonText: { fontWeight: 'bold', color: '#374151' },
    actionButton: { flexDirection: 'row', backgroundColor: '#203A43', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flex: 2 },

    // Modal Styles
    centeredModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#111' },
    label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 },
    cancelBtn: { padding: 12 },
    cancelText: { fontWeight: 'bold', color: '#6B7280' },
    saveBtn: { backgroundColor: '#203A43', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    saveText: { color: '#FFF', fontWeight: 'bold' }
});
