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
    RefreshControl,
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Wallet, DollarSign, Calendar, ShoppingBag, X, Plus, Minus, Trash2, CheckCircle, Pencil, MessageCircle, FileText } from 'lucide-react-native';
import { db } from '../../services/db';
import { ReceiptService } from '../../services/receipt';
import { Client, Sale, PaymentRecord } from '../../types';
import { Colors } from '../../constants/colors';

// --- ITEM DA LISTA (Pode ser Venda ou Pagamento) ---
// Extracted to components/clients/TransactionItem.tsx
import { TransactionItem } from '../../components/clients/TransactionItem';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

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

    // Modal Edição Venda
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editedItems, setEditedItems] = useState<any[]>([]);

    // Modal Edição Cliente
    const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false);
    const [clientEditData, setClientEditData] = useState<{
        name: string;
        cpf: string;
        phone: string;
        address: string;
        neighborhood: string;
        nextPaymentDate?: string;
    }>({ name: '', cpf: '', phone: '', address: '', neighborhood: '' });



    const openClientEditModal = () => {
        if (!client) return;
        setClientEditData({
            name: client.name,
            cpf: client.cpf || '',
            phone: client.phone || '',
            address: client.address || '',
            neighborhood: client.neighborhood || '',
            nextPaymentDate: client.nextPaymentDate
        });
        setIsClientEditModalOpen(true);
    };

    const handleUpdateClient = async () => {
        if (!client || !clientEditData.name.trim()) {
            Alert.alert("Erro", "Nome é obrigatório.");
            return;
        }
        try {
            await db.updateClient({
                id: client.id,
                name: clientEditData.name,
                cpf: clientEditData.cpf || undefined,
                phone: clientEditData.phone || undefined,
                address: clientEditData.address || undefined,
                neighborhood: clientEditData.neighborhood || undefined,
                nextPaymentDate: clientEditData.nextPaymentDate
            });
            Alert.alert("Sucesso", "Dados atualizados!");
            setIsClientEditModalOpen(false);
            fetchData(true);
        } catch (e) {
            Alert.alert("Erro", "Falha ao atualizar cliente.");
        }
    };

    const handleDeleteClient = () => {
        if (!client) return;

        if (client.totalDebt > 0) {
            Alert.alert(
                "Não é possível excluir",
                `Este cliente possui uma dívida de R$ ${client.totalDebt.toFixed(2)}. É necessário quitar o débito antes de excluir o cadastro.`
            );
            return;
        }

        Alert.alert(
            "Excluir Cliente",
            "Tem certeza que deseja excluir este cliente? Todo o histórico de vendas e pagamentos será apagado permanentemente.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setInitialLoading(true);
                            await db.deleteClient(client.id);
                            router.replace('/(tabs)/clients');
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Erro", "Falha ao excluir cliente.");
                            setInitialLoading(false);
                        }
                    }
                }
            ]
        );
    };

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

    // --- COMPARTILHAR ---
    const shareClientReport = async () => {
        if (!client) return;
        const message = `Relatório do Cliente: *${client.name}*\n` +
            `Débito Total: R$ ${client.totalDebt.toFixed(2)}\n` +
            `Crédito Disponível: R$ ${client.credit.toFixed(2)}`;

        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <ScreenHeader
                title="Detalhes do Cliente"
                rightAction={
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={handleDeleteClient}>
                            <Trash2 size={24} color={Colors.danger} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openClientEditModal}>
                            <Pencil size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={shareClientReport}>
                            <FileText size={24} color={Colors.secondary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                    <Text style={styles.clientNameHeader}>{client?.name}</Text>
                </View>

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

                <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 20 }}>
                    <TouchableOpacity style={[styles.paymentButton, { flex: 1, marginTop: 0, marginHorizontal: 0 }]} onPress={() => setIsPayModalOpen(true)}>
                        <DollarSign size={20} color="#16A34A" style={{ marginRight: 8 }} />
                        <Text style={styles.paymentButtonText}>Pagar</Text>
                    </TouchableOpacity>

                    {client.totalDebt > 0 && (
                        <TouchableOpacity
                            style={[styles.paymentButton, { flex: 1, marginTop: 0, marginHorizontal: 0, borderColor: '#203A43', backgroundColor: '#203A43' }]}
                            onPress={async () => {
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
                                                onPress: openClientEditModal // Uses existing edit modal
                                            }
                                        ]
                                    );
                                    return;
                                }

                                // 2. Find Oldest Unpaid Sale for Context
                                try {
                                    const clientSales = await db.getClientSales(client.id);
                                    const unpaidSales = clientSales.filter(s => s.remainingBalance > 0);
                                    unpaidSales.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                                    const oldestSale = unpaidSales[0];
                                    const purchaseDate = oldestSale ? new Date(oldestSale.timestamp).toLocaleDateString('pt-BR') : 'data desconhecida';

                                    const dueDateObj = new Date(oldestSale ? oldestSale.timestamp : new Date());
                                    dueDateObj.setDate(dueDateObj.getDate() + 30);
                                    const dueDate = dueDateObj.toLocaleDateString('pt-BR');

                                    const message = `Olá *${client.name}*! 👋

Consta em nosso sistema uma pendência de *${client.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*.

Referente à compra do dia *${purchaseDate}* (Vencimento: *${dueDate}*).

Podemos agendar o pagamento?

_Mensagem automática - Gestor de Vendas_`;

                                    if (phone.length <= 11) phone = '55' + phone;
                                    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

                                    const supported = await Linking.canOpenURL(url);
                                    if (supported) {
                                        await Linking.openURL(url);
                                    } else {
                                        Alert.alert("Erro", "WhatsApp não está instalado.");
                                    }
                                } catch (e) {
                                    Alert.alert("Erro", "Falha ao gerar cobrança.");
                                }
                            }}
                        >
                            <MessageCircle size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={[styles.paymentButtonText, { color: '#FFF' }]}>Cobrar</Text>
                        </TouchableOpacity>
                    )}
                </View>

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
                    renderItem={({ item }) => <TransactionItem item={item} onEdit={openEditModal} clientName={client.name} />}
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
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                {editingSale && (
                                    <TouchableOpacity onPress={() => ReceiptService.shareReceipt(editingSale)}>
                                        <FileText size={24} color="#203A43" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
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

            {/* MODAL EDIÇÃO CLIENTE */}
            <Modal visible={isClientEditModalOpen} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.editModalContent}>
                        <View style={styles.payModalHeader}>
                            <Text style={styles.payModalTitle}>Editar Cliente</Text>
                            <TouchableOpacity onPress={() => setIsClientEditModalOpen(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={{ gap: 16 }}>
                                <View>
                                    <Text style={styles.payLabel}>Nome</Text>
                                    <TextInput style={styles.input} value={clientEditData.name} onChangeText={t => setClientEditData({ ...clientEditData, name: t })} />
                                </View>
                                <View>
                                    <Text style={styles.payLabel}>CPF</Text>
                                    <TextInput style={styles.input} value={clientEditData.cpf} onChangeText={t => setClientEditData({ ...clientEditData, cpf: t })} keyboardType="numeric" />
                                </View>
                                <View>
                                    <Text style={styles.payLabel}>Telefone</Text>
                                    <TextInput style={styles.input} value={clientEditData.phone} onChangeText={t => setClientEditData({ ...clientEditData, phone: t })} keyboardType="phone-pad" />
                                </View>
                                <View>
                                    <Text style={styles.payLabel}>Endereço</Text>
                                    <TextInput style={styles.input} value={clientEditData.address} onChangeText={t => setClientEditData({ ...clientEditData, address: t })} />
                                </View>
                                <View>
                                    <Text style={styles.payLabel}>Bairro</Text>
                                    <TextInput style={styles.input} value={clientEditData.neighborhood} onChangeText={t => setClientEditData({ ...clientEditData, neighborhood: t })} />
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={[styles.confirmPayBtn, { marginTop: 24 }]} onPress={handleUpdateClient}>
                            <Text style={styles.confirmPayText}>Salvar Alterações</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 20, marginBottom: 16 },
    clientNameHeader: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary, flex: 1 },
    editClientBtn: { padding: 8, backgroundColor: Colors.background, borderRadius: 8 },
    input: { backgroundColor: Colors.text.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: Colors.text.primary },

    heroCard: {
        backgroundColor: Colors.primaryDark,
        marginHorizontal: 20, borderRadius: 16, padding: 24, minHeight: 140,
        justifyContent: 'space-between', overflow: 'hidden', position: 'relative',
        shadowColor: Colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    cardBgIcon: { position: 'absolute', right: -20, bottom: -20 },
    heroLabel: { color: Colors.text.muted, fontSize: 14, fontWeight: '500', marginBottom: 4 },
    heroValue: { color: Colors.white, fontSize: 36, fontWeight: 'bold' },
    heroFooter: { marginTop: 12 },
    creditTag: {
        backgroundColor: 'rgba(37, 99, 235, 0.2)', alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.5)',
    },
    creditTagText: { color: '#60A5FA', fontSize: 12, fontWeight: '600' }, // Keeping this as is for now or use Colors.info

    paymentButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginHorizontal: 20, marginTop: 20, backgroundColor: Colors.white,
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.secondary,
        elevation: 2
    },
    paymentButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary },

    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, marginTop: 24 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { fontSize: 14, fontWeight: '500', color: Colors.text.secondary },
    activeTabText: { color: Colors.primary, fontWeight: 'bold' },

    listContent: { padding: 20, paddingBottom: 50 },
    saleItem: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.background },

    // Estilos de Pagamento
    paymentItem: { backgroundColor: Colors.secondaryLight, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.secondaryLight },
    paymentValue: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary },
    paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    paymentBadgeText: { fontSize: 12, fontWeight: 'bold', color: Colors.secondary },

    saleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    saleDateContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    saleDate: { fontSize: 12, color: Colors.text.muted },
    saleTime: { fontSize: 12, color: Colors.text.muted, marginLeft: 4 },
    saleTotalValue: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    saleItemsText: { fontSize: 14, color: Colors.text.secondary, marginBottom: 12 },

    progressContainer: { marginTop: 8 },
    progressBarBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: Colors.secondary },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    paidLabel: { fontSize: 10, color: Colors.secondary, fontWeight: 'bold' },
    remainingLabel: { fontSize: 10, color: Colors.danger, fontWeight: 'bold' },

    paidBadge: { alignSelf: 'flex-start', backgroundColor: Colors.secondaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    paidBadgeText: { color: Colors.secondary, fontSize: 10, fontWeight: 'bold' },

    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: Colors.text.muted, marginTop: 8 },

    // Modais
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    payModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    payModalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    payLabel: { fontSize: 16, color: Colors.text.secondary, marginBottom: 12 },
    payInput: { fontSize: 32, fontWeight: 'bold', color: Colors.primary, borderBottomWidth: 2, borderBottomColor: Colors.primary, paddingVertical: 8, marginBottom: 24, textAlign: 'center' },

    quickButtons: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
    quickBtn: { backgroundColor: Colors.background, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    quickBtnText: { color: Colors.text.secondary, fontWeight: 'bold' },

    confirmPayBtn: { backgroundColor: Colors.secondary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    confirmPayText: { color: Colors.white, fontWeight: 'bold', fontSize: 18 },

    editModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    subTitle: { fontSize: 12, color: Colors.text.muted },
    editItemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.background },
    editItemName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.secondary, marginBottom: 8 },
    editControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { backgroundColor: Colors.background, padding: 8, borderRadius: 8 },
    qtyText: { fontSize: 16, fontWeight: 'bold' },
    priceInputSmall: { backgroundColor: Colors.text.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 8, width: 60, textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
    editItemTotal: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginTop: 4 },
    editFooter: { marginTop: 20 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    totalLabel: { fontSize: 16, color: Colors.text.muted },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
    disclaimer: { fontSize: 12, color: Colors.text.muted, textAlign: 'center', marginBottom: 16 },
    saveEditBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveEditText: { color: Colors.white, fontWeight: 'bold', fontSize: 18 },

    paySpecificBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.secondary, backgroundColor: Colors.secondaryLight },
    paySpecificText: { color: Colors.secondary, fontWeight: 'bold', fontSize: 16 }
});