import React, { useState, useCallback, memo, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Wallet, DollarSign, Calendar, ShoppingBag, X, Plus, Minus, Trash2, CheckCircle } from 'lucide-react-native';
import { db } from '../../services/db';
import { Client, Sale, PaymentRecord } from '../../types';

// --- ITEM DA LISTA (Pode ser Venda ou Pagamento) ---
const TransactionItem = memo(({ item, onEdit }: { item: any, onEdit: (s: Sale) => void }) => {

    // Se for um PAGAMENTO (Tem 'amount' mas não 'items')
    if (item.amount !== undefined && !item.items) {
        return (
            <View style={styles.paymentItem}>
                <View style={styles.saleHeader}>
                    <View style={styles.saleDateContainer}>
                        <Calendar size={14} color="#16A34A" />
                        <Text style={[styles.saleDate, { color: '#16A34A' }]}>
                            {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                        </Text>
                        <Text style={[styles.saleTime, { color: '#16A34A' }]}>
                            {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text style={styles.paymentValue}>+ R$ {item.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.paymentBadge}>
                    <CheckCircle size={12} color="#16A34A" />
                    <Text style={styles.paymentBadgeText}>PAGAMENTO RECEBIDO</Text>
                </View>
            </View>
        );
    }

    // Se for uma VENDA
    const sale = item as Sale;
    const progress = sale.finalTotal > 0
        ? ((sale.finalTotal - sale.remainingBalance) / sale.finalTotal) * 100
        : 100;

    return (
        <TouchableOpacity
            style={styles.saleItem}
            onPress={() => onEdit(sale)}
            activeOpacity={0.7}
        >
            <View style={styles.saleHeader}>
                <View style={styles.saleDateContainer}>
                    <Calendar size={14} color="#9CA3AF" />
                    <Text style={styles.saleDate}>
                        {new Date(sale.timestamp).toLocaleDateString('pt-BR')}
                    </Text>
                    <Text style={styles.saleTime}>
                        {new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <Text style={styles.saleTotalValue}>R$ {sale.finalTotal.toFixed(2)}</Text>
            </View>

            <Text style={styles.saleItemsText} numberOfLines={2}>
                {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
            </Text>

            {sale.remainingBalance > 0 ? (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={styles.paidLabel}>Pago: R$ {(sale.finalTotal - sale.remainingBalance).toFixed(2)}</Text>
                        <Text style={styles.remainingLabel}>Resta: R$ {sale.remainingBalance.toFixed(2)}</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>QUITADO</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

export default function ClientDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [client, setClient] = useState<Client | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]); // Novo estado para pagamentos

    // Loading States
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

    // Modal Pagamento
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    // Modal Edição
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editedItems, setEditedItems] = useState<any[]>([]);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!id) return;
        if (!isRefresh) setInitialLoading(true);

        try {
            const [clientData, salesData, paymentsData] = await Promise.all([
                db.getClient(id as string),
                db.getClientSales(id as string),
                db.getClientPayments(id as string) // Busca pagamentos
            ]);
            setClient(clientData);
            setSales(salesData);
            setPayments(paymentsData);
        } catch (e) {
            console.error(e);
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            if (!client) {
                fetchData(false);
            } else {
                fetchData(true);
            }
        }, [fetchData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    // --- AÇÕES ---
    const handlePayment = async () => {
        const amount = parseFloat(payAmount.replace(',', '.'));
        if (!amount || amount <= 0) return;
        setProcessingPayment(true);
        try {
            await db.processPaymentFIFO(id as string, amount);
            Alert.alert("Sucesso", "Pagamento registrado!");
            setIsPayModalOpen(false);
            setPayAmount('');
            fetchData(true);
        } catch (e) {
            Alert.alert("Erro", "Falha ao registrar pagamento.");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handlePayFullSale = async () => {
        if (!editingSale) return;
        Alert.alert(
            "Receber Venda",
            `Confirmar recebimento de R$ ${editingSale.remainingBalance.toFixed(2)} referente a esta venda?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar Recebimento",
                    onPress: async () => {
                        try {
                            await db.payOneSale(editingSale.id);
                            setIsEditModalOpen(false);
                            fetchData(true);
                            Alert.alert("Sucesso", "Venda quitada!");
                        } catch (e) {
                            Alert.alert("Erro", "Não foi possível quitar a venda.");
                        }
                    }
                }
            ]
        );
    };

    const addQuickAmount = (val: number) => {
        const current = parseFloat(payAmount.replace(',', '.') || '0');
        setPayAmount((current + val).toFixed(2));
    };

    // --- EDIÇÃO DE VENDA ---
    const openEditModal = useCallback((sale: Sale) => {
        setEditingSale(sale);
        setEditedItems(sale.items.map(i => ({ ...i })));
        setIsEditModalOpen(true);
    }, []);

    const updateItemQty = (index: number, delta: number) => {
        const newItems = [...editedItems];
        newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
        setEditedItems(newItems);
    };

    const updateItemPrice = (index: number, text: string) => {
        const newItems = [...editedItems];
        const val = parseFloat(text.replace(',', '.')) || 0;
        newItems[index].unitPrice = val;
        setEditedItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = [...editedItems];
        newItems.splice(index, 1);
        setEditedItems(newItems);
    };

    const saveSaleChanges = async () => {
        if (!editingSale) return;
        if (editedItems.length === 0) {
            Alert.alert("Erro", "A venda não pode ficar sem itens.");
            return;
        }
        try {
            await db.updateSale(editingSale.id, editedItems);
            Alert.alert("Sucesso", "Venda atualizada!");
            setIsEditModalOpen(false);
            fetchData(true);
        } catch (e) {
            Alert.alert("Erro", "Falha ao atualizar venda.");
        }
    };

    const calculateNewTotal = () => {
        const sub = editedItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
        return sub + (editingSale?.discountOrAdjustment || 0);
    };

    // --- PREPARAÇÃO DA LISTA ---
    // Histórico misto: Vendas + Pagamentos ordenados por data
    const mixedHistory = useMemo(() => {
        const combined = [...sales, ...payments];
        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [sales, payments]);

    const pendingSales = sales.filter(s => s.remainingBalance > 0);

    // Se a aba for pendente, mostra só vendas pendentes. Se for Histórico, mostra TUDO (Extrato).
    const displayList = activeTab === 'PENDING' ? pendingSales : mixedHistory;

    if (initialLoading && !client) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#203A43" />
            </View>
        );
    }

    if (!client) return null;

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ backgroundColor: '#fff' }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Carteira do Cliente</Text>
                    <View style={{ width: 24 }} />
                </View>
            </SafeAreaView>

            <View style={styles.content}>
                <Text style={styles.clientNameHeader}>{client.name}</Text>

                <View style={styles.heroCard}>
                    <View style={styles.cardBgIcon}>
                        <Wallet size={140} color="rgba(255,255,255,0.05)" />
                    </View>
                    <View>
                        <Text style={styles.heroLabel}>Saldo Devedor Total</Text>
                        <Text style={styles.heroValue}>
                            R$ {client.totalDebt.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>
                    <View style={styles.heroFooter}>
                        {client.credit > 0 ? (
                            <View style={styles.creditTag}>
                                <Text style={styles.creditTagText}>Crédito disponível: R$ {client.credit.toFixed(2)}</Text>
                            </View>
                        ) : (
                            <Text style={{ color: '#64748B', fontSize: 12 }}>Sem créditos disponíveis</Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity style={styles.paymentButton} onPress={() => setIsPayModalOpen(true)}>
                    <DollarSign size={20} color="#16A34A" style={{ marginRight: 8 }} />
                    <Text style={styles.paymentButtonText}>Registrar Pagamento</Text>
                </TouchableOpacity>

                <View style={styles.tabs}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'PENDING' && styles.activeTab]} onPress={() => setActiveTab('PENDING')}>
                        <Text style={[styles.tabText, activeTab === 'PENDING' && styles.activeTabText]}>Pendentes ({pendingSales.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'HISTORY' && styles.activeTab]} onPress={() => setActiveTab('HISTORY')}>
                        <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.activeTabText]}>Histórico Completo</Text>
                    </TouchableOpacity>
                </View>

                {/* LISTA OTIMIZADA */}
                <FlatList
                    data={displayList}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <TransactionItem item={item} onEdit={openEditModal} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyState}>
                            <ShoppingBag size={48} color="#E5E7EB" />
                            <Text style={styles.emptyText}>Nenhuma movimentação encontrada.</Text>
                        </View>
                    )}
                />
            </View>

            {/* MODAL PAGAMENTO */}
            <Modal visible={isPayModalOpen} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.payModalContent}>
                        <View style={styles.payModalHeader}>
                            <Text style={styles.payModalTitle}>Registrar Pagamento</Text>
                            <TouchableOpacity onPress={() => setIsPayModalOpen(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.payLabel}>Quanto o cliente pagou?</Text>
                        <TextInput
                            style={styles.payInput} value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" placeholder="0,00" autoFocus
                        />
                        <View style={styles.quickButtons}>
                            <TouchableOpacity style={styles.quickBtn} onPress={() => addQuickAmount(10)}><Text style={styles.quickBtnText}>+ R$ 10</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.quickBtn} onPress={() => addQuickAmount(50)}><Text style={styles.quickBtnText}>+ R$ 50</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.quickBtn} onPress={() => addQuickAmount(100)}><Text style={styles.quickBtnText}>+ R$ 100</Text></TouchableOpacity>
                        </View>
                        <TouchableOpacity style={[styles.confirmPayBtn, processingPayment && { opacity: 0.7 }]} onPress={handlePayment} disabled={processingPayment}>
                            <Text style={styles.confirmPayText}>{processingPayment ? "Processando..." : "Confirmar Pagamento"}</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL EDIÇÃO DE VENDA */}
            <Modal visible={isEditModalOpen} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.editModalContent}>
                        <View style={styles.payModalHeader}>
                            <View>
                                <Text style={styles.payModalTitle}>Editar Venda</Text>
                                <Text style={styles.subTitle}>{editingSale && new Date(editingSale.timestamp).toLocaleString('pt-BR')}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {editedItems.map((item, index) => (
                                <View key={index} style={styles.editItemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.editItemName}>{item.productName}</Text>
                                        <View style={styles.editControls}>
                                            <TouchableOpacity onPress={() => updateItemQty(index, -1)} style={styles.qtyBtn}><Minus size={16} color="#374151" /></TouchableOpacity>
                                            <Text style={styles.qtyText}>{item.quantity}</Text>
                                            <TouchableOpacity onPress={() => updateItemQty(index, 1)} style={styles.qtyBtn}><Plus size={16} color="#374151" /></TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <TouchableOpacity onPress={() => removeItem(index)}>
                                            <Trash2 size={18} color="#EF4444" style={{ marginBottom: 8 }} />
                                        </TouchableOpacity>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: '#6B7280', fontSize: 12 }}>Preço Un: </Text>
                                            <TextInput
                                                style={styles.priceInputSmall}
                                                defaultValue={item.unitPrice.toString()}
                                                keyboardType="numeric"
                                                onEndEditing={(e) => updateItemPrice(index, e.nativeEvent.text)}
                                            />
                                        </View>
                                        <Text style={styles.editItemTotal}>R$ {(item.unitPrice * item.quantity).toFixed(2)}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.editFooter}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Novo Total</Text>
                                <Text style={styles.totalValue}>R$ {calculateNewTotal().toFixed(2)}</Text>
                            </View>

                            <TouchableOpacity style={styles.saveEditBtn} onPress={saveSaleChanges}>
                                <Text style={styles.saveEditText}>Salvar Alterações</Text>
                            </TouchableOpacity>

                            {/* BOTÃO DE RECEBER ESTA VENDA ESPECÍFICA */}
                            {editingSale && editingSale.remainingBalance > 0 && (
                                <TouchableOpacity
                                    style={styles.paySpecificBtn}
                                    onPress={handlePayFullSale}
                                >
                                    <CheckCircle size={18} color="#16A34A" style={{ marginRight: 8 }} />
                                    <Text style={styles.paySpecificText}>
                                        Receber Total (R$ {editingSale.remainingBalance.toFixed(2)})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
        paddingTop: Platform.OS === 'android' ? 40 : 12,
    },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

    content: { flex: 1 },
    clientNameHeader: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginHorizontal: 20, marginTop: 20, marginBottom: 16 },

    heroCard: {
        backgroundColor: '#0F2027',
        marginHorizontal: 20, borderRadius: 16, padding: 24, minHeight: 140,
        justifyContent: 'space-between', overflow: 'hidden', position: 'relative',
        shadowColor: '#0F2027', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    cardBgIcon: { position: 'absolute', right: -20, bottom: -20 },
    heroLabel: { color: '#94A3B8', fontSize: 14, fontWeight: '500', marginBottom: 4 },
    heroValue: { color: '#FFF', fontSize: 36, fontWeight: 'bold' },
    heroFooter: { marginTop: 12 },
    creditTag: {
        backgroundColor: 'rgba(37, 99, 235, 0.2)', alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.5)',
    },
    creditTagText: { color: '#60A5FA', fontSize: 12, fontWeight: '600' },

    paymentButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff',
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#16A34A',
        elevation: 2
    },
    paymentButtonText: { fontSize: 16, fontWeight: 'bold', color: '#16A34A' },

    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginTop: 24 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#203A43' },
    tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
    activeTabText: { color: '#203A43', fontWeight: 'bold' },

    listContent: { padding: 20, paddingBottom: 50 },
    saleItem: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },

    // Estilos de Pagamento
    paymentItem: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#DCFCE7' },
    paymentValue: { fontSize: 16, fontWeight: 'bold', color: '#16A34A' },
    paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    paymentBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#16A34A' },

    saleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    saleDateContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    saleDate: { fontSize: 12, color: '#9CA3AF' },
    saleTime: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
    saleTotalValue: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    saleItemsText: { fontSize: 14, color: '#4B5563', marginBottom: 12 },

    progressContainer: { marginTop: 8 },
    progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#16A34A' },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    paidLabel: { fontSize: 10, color: '#16A34A', fontWeight: 'bold' },
    remainingLabel: { fontSize: 10, color: '#EF4444', fontWeight: 'bold' },

    paidBadge: { alignSelf: 'flex-start', backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    paidBadgeText: { color: '#16A34A', fontSize: 10, fontWeight: 'bold' },

    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#9CA3AF', marginTop: 8 },

    // Modais
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    payModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    payModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    payLabel: { fontSize: 16, color: '#374151', marginBottom: 12 },
    payInput: { fontSize: 32, fontWeight: 'bold', color: '#203A43', borderBottomWidth: 2, borderBottomColor: '#203A43', paddingVertical: 8, marginBottom: 24, textAlign: 'center' },

    quickButtons: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
    quickBtn: { backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    quickBtnText: { color: '#4B5563', fontWeight: 'bold' },

    confirmPayBtn: { backgroundColor: '#16A34A', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    confirmPayText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },

    editModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    subTitle: { fontSize: 12, color: '#9CA3AF' },
    editItemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    editItemName: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
    editControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8 },
    qtyText: { fontSize: 16, fontWeight: 'bold' },
    priceInputSmall: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 8, width: 60, textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
    editItemTotal: { fontSize: 16, fontWeight: 'bold', color: '#203A43', marginTop: 4 },
    editFooter: { marginTop: 20 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    totalLabel: { fontSize: 16, color: '#6B7280' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#203A43' },
    disclaimer: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 16 },
    saveEditBtn: { backgroundColor: '#203A43', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveEditText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },

    paySpecificBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
    paySpecificText: { color: '#16A34A', fontWeight: 'bold', fontSize: 16 }
});