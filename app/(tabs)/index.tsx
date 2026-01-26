import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    FlatList,
    ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, X, Minus, Trash2, Search, FileText, CheckCircle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import { ReceiptService } from '../../services/receipt';
import { Sale, PaymentRecord, Product, Client } from '../../types';
import { Colors } from '../../constants/colors';

// Imported Components
import { AlertsSection } from '../../components/dashboard/AlertsSection';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { HistorySection } from '../../components/dashboard/HistorySection';
import { FadeIn } from '../../components/ui/FadeIn';

// Componente para Input de Preço Seguro
const PriceInput = ({ value, onChange, style }: { value: number, onChange: (val: number) => void, style?: any }) => {
    const [text, setText] = useState(value.toFixed(2));

    const handleEndEditing = () => {
        const val = parseFloat(text.replace(',', '.')) || 0;
        onChange(val);
        setText(val.toFixed(2));
    };

    return (
        <TextInput
            style={[styles.priceInputSmall, style]}
            value={text}
            onChangeText={setText}
            onEndEditing={handleEndEditing}
            keyboardType="numeric"
        />
    );
};

export default function DashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';
    const [historyTab, setHistoryTab] = useState<'ALL' | 'CASH' | 'CREDIT'>('ALL');
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<(PaymentRecord & { clientName: string })[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [alerts, setAlerts] = useState<{ stockAlerts: Product[], debtAlerts: Client[] }>({ stockAlerts: [], debtAlerts: [] });
    const [loading, setLoading] = useState(false);

    // --- STATES DO MODAL DE EDIÇÃO ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editedItems, setEditedItems] = useState<any[]>([]);
    const [editedDiscount, setEditedDiscount] = useState(0);

    // --- STATES PARA ADICIONAR ITEM ---
    const [showProductList, setShowProductList] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [salesData, paymentsData, productsData, alertsData] = await Promise.all([
                db.getSales(),
                db.getAllPayments(20), // Fetch only recent payments
                db.getProducts(),
                db.checkAlerts()
            ]);
            setSales(salesData);
            setPayments(paymentsData);
            setProducts(productsData);
            setAlerts(alertsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const mixedHistory = useMemo(() => {
        const combined = [...sales, ...payments];
        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [sales, payments]);

    const filteredHistory = mixedHistory.filter(item => {
        const isSale = 'items' in item;
        if (historyTab === 'ALL') return true;
        if (historyTab === 'CASH') return isSale ? (item as Sale).type === 'CASH' : true;
        if (historyTab === 'CREDIT') return isSale ? (item as Sale).type === 'CREDIT' : false;
        return true;
    });

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [products, searchQuery]);

    // --- FUNÇÕES DE EDIÇÃO ---
    const openEditModal = (sale: Sale) => {
        setEditingSale(sale);
        // @ts-ignore
        setEditedItems(sale.items.map(i => ({ ...i })));
        setEditedDiscount(sale.discountOrAdjustment || 0);
        setIsEditModalOpen(true);
        setShowProductList(false);
        setSearchQuery('');
    };

    const updateItemQty = (index: number, delta: number) => {
        const newItems = [...editedItems];
        newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
        setEditedItems(newItems);
    };

    const updateItemPrice = (index: number, newVal: number) => {
        const newItems = [...editedItems];
        newItems[index].unitPrice = newVal;
        setEditedItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = [...editedItems];
        newItems.splice(index, 1);
        setEditedItems(newItems);
    };

    const handleAddItem = (product: Product) => {
        const newItems = [...editedItems];
        const existingIndex = newItems.findIndex(i => i.productId === product.id);

        if (existingIndex >= 0) {
            newItems[existingIndex].quantity += 1;
        } else {
            newItems.push({
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: product.price,
                total: product.price
            });
        }
        setEditedItems(newItems);
        setShowProductList(false);
        setSearchQuery('');
    };

    const calculateNewSubtotal = () => {
        return editedItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
    };

    const calculateNewTotal = () => {
        return calculateNewSubtotal() + editedDiscount;
    };

    const saveSaleChanges = async () => {
        if (!editingSale) return;
        if (editedItems.length === 0) {
            Alert.alert("Erro", "A venda não pode ficar sem itens.");
            return;
        }
        try {
            await db.updateSale(editingSale.id, editedItems, editedDiscount);
            Alert.alert("Sucesso", "Venda atualizada!");
            setIsEditModalOpen(false);
            loadData();
        } catch (e) {
            Alert.alert("Erro", "Falha ao atualizar venda: " + e);
        }
    };

    const handleDeleteSale = async () => {
        if (!editingSale) return;
        Alert.alert(
            "Excluir Venda",
            "Tem certeza que deseja apagar esta venda? Esta ação não pode ser desfeita.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await db.deleteSale(editingSale.id);
                            Alert.alert("Sucesso", "Venda excluída!");
                            setIsEditModalOpen(false);
                            loadData();
                        } catch (e) {
                            Alert.alert("Erro", "Falha ao excluir venda.");
                        }
                    }
                }
            ]
        );
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
                            loadData();
                            Alert.alert("Sucesso", "Venda quitada!");
                        } catch (e) {
                            Alert.alert("Erro", "Não foi possível quitar a venda.");
                        }
                    }
                }
            ]
        );
    };


    // --- PAYMENT EDIT STATE ---
    const [editingPayment, setEditingPayment] = useState<(PaymentRecord & { clientName: string }) | null>(null);
    const [editPaymentValue, setEditPaymentValue] = useState('');

    const openPaymentModal = (payment: (PaymentRecord & { clientName: string })) => {
        setEditingPayment(payment);
        setEditPaymentValue(payment.amount.toFixed(2));
    };

    const handleSavePayment = async () => {
        if (!editingPayment) return;
        const newVal = parseFloat(editPaymentValue.replace(',', '.'));
        if (isNaN(newVal) || newVal < 0) {
            Alert.alert("Erro", "Valor inválido");
            return;
        }

        try {
            await db.updatePayment(editingPayment.id, newVal);
            Alert.alert("Sucesso", "Pagamento atualizado");
            setEditingPayment(null);
            loadData();
        } catch (e) {
            Alert.alert("Erro", "Erro ao atualizar: " + e);
        }
    };

    const handleDeletePayment = async () => {
        if (!editingPayment) return;
        Alert.alert(
            "Excluir Pagamento",
            "Tem certeza? A dívida do cliente aumentará.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await db.deletePayment(editingPayment.id);
                            Alert.alert("Sucesso", "Pagamento excluído");
                            setEditingPayment(null);
                            loadData();
                        } catch (e) {
                            Alert.alert("Erro", "Erro ao excluir: " + e);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Top Header Section */}
            <LinearGradient
                colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerContainer}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.welcomeLabel}>Bem vindo,</Text>
                            <Text style={styles.userNameText}>{firstName}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/settings')}>
                            <View style={styles.avatarSmall}>
                                <Text style={styles.avatarTextSmall}>{firstName.charAt(0)}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.newSaleButton} onPress={() => router.push('/sales/new')}>
                        <View style={styles.iconCircle}>
                            <Plus size={24} color={Colors.white} />
                        </View>
                        <Text style={styles.newSaleButtonText}>Iniciar Nova Venda</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.bodyContent}>

                <FadeIn delay={100}>
                    <AlertsSection alerts={alerts} />
                </FadeIn>

                <View style={{ height: 20 }} />

                <FadeIn delay={200}>
                    <QuickActions />
                </FadeIn>

                <View style={{ height: 20 }} />

                <FadeIn delay={300} style={{ flex: 1 }}>
                    <HistorySection
                        historyTab={historyTab}
                        setHistoryTab={setHistoryTab}
                        filteredHistory={filteredHistory}
                        loading={loading}
                        loadData={loadData}
                        openPaymentModal={openPaymentModal}
                        openEditModal={openEditModal}
                    />
                </FadeIn>

            </View>

            {/* MODAL EDIÇÃO DE PAGAMENTO */}
            <Modal visible={!!editingPayment} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={[styles.editModalContent, { maxHeight: 'auto' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={styles.payModalTitle}>Editar Pagamento</Text>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                {editingPayment && (
                                    <TouchableOpacity onPress={() => ReceiptService.sharePaymentReceipt(editingPayment)}>
                                        <FileText size={24} color={Colors.secondary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setEditingPayment(null)}>
                                    <X size={24} color={Colors.text.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={{ marginBottom: 12, fontSize: 16 }}>{editingPayment?.clientName}</Text>

                        <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Valor Recebido</Text>
                        <TextInput
                            style={styles.bigInput}
                            value={editPaymentValue}
                            onChangeText={setEditPaymentValue}
                            keyboardType="numeric"
                        />

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                            <TouchableOpacity style={[styles.saveEditBtn, { flex: 1, backgroundColor: Colors.danger }]} onPress={handleDeletePayment}>
                                <Text style={styles.saveEditText}>Excluir</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveEditBtn, { flex: 1 }]} onPress={handleSavePayment}>
                                <Text style={styles.saveEditText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL EDIÇÃO DE VENDA */}
            <Modal visible={isEditModalOpen} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={[styles.editModalContent, showProductList && { flex: 1, maxHeight: '95%' }]}>
                        {/* HEADER DO MODAL */}
                        <View style={styles.payModalHeader}>
                            <View>
                                <Text style={styles.payModalTitle}>
                                    {showProductList ? 'Adicionar Produto' : 'Detalhes da Venda'}
                                </Text>
                                {!showProductList && (
                                    <Text style={styles.subTitle}>{editingSale && new Date(editingSale.timestamp).toLocaleString('pt-BR')}</Text>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                {editingSale && (
                                    <TouchableOpacity onPress={() => ReceiptService.shareReceipt(editingSale)}>
                                        <FileText size={24} color={Colors.primary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => {
                                    if (showProductList) setShowProductList(false); // Voltar
                                    else setIsEditModalOpen(false); // Fechar
                                }}>
                                    <X size={24} color={Colors.text.secondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* CONTEÚDO */}
                        {showProductList ? (
                            <View style={{ flex: 1 }}>
                                <View style={styles.searchBox}>
                                    <Search size={20} color={Colors.text.muted} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Buscar produto..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoFocus
                                        placeholderTextColor={Colors.text.muted}
                                    />
                                </View>
                                <FlatList // Lista de produtos para adicionar
                                    data={filteredProducts}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.productItem} onPress={() => handleAddItem(item)}>
                                            <View>
                                                <Text style={styles.productName}>{item.name}</Text>
                                                <Text style={styles.productPrice}>R$ {item.price.toFixed(2)}</Text>
                                            </View>
                                            <Plus size={20} color={Colors.secondary} />
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            </View>
                        ) : (
                            <>
                                <View style={{ flex: 1 }}>
                                    {/* Wrapping in simple View/ScrollView as per basic logic */}
                                    <ScrollView style={{ flex: 1 }}>
                                        {editedItems.map((item, index) => (
                                            <View key={index} style={styles.editItemRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.editItemName}>{item.productName}</Text>
                                                    <View style={styles.editControls}>
                                                        <TouchableOpacity onPress={() => updateItemQty(index, -1)} style={styles.qtyBtn}><Minus size={16} color={Colors.text.secondary} /></TouchableOpacity>
                                                        <Text style={styles.qtyText}>{item.quantity}</Text>
                                                        <TouchableOpacity onPress={() => updateItemQty(index, 1)} style={styles.qtyBtn}><Plus size={16} color={Colors.text.secondary} /></TouchableOpacity>
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <TouchableOpacity onPress={() => removeItem(index)}>
                                                        <Trash2 size={18} color={Colors.danger} style={{ marginBottom: 8 }} />
                                                    </TouchableOpacity>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={{ color: Colors.text.muted, fontSize: 12 }}>Preço Un: </Text>
                                                        <PriceInput
                                                            value={item.unitPrice}
                                                            onChange={(val) => updateItemPrice(index, val)}
                                                        />
                                                    </View>
                                                    <Text style={styles.editItemTotal}>R$ {(item.unitPrice * item.quantity).toFixed(2)}</Text>
                                                </View>
                                            </View>
                                        ))}
                                        <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowProductList(true)}>
                                            <Plus size={20} color={Colors.secondary} style={{ marginRight: 8 }} />
                                            <Text style={styles.addItemText}>Adicionar Item</Text>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>

                                <View style={styles.editFooter}>
                                    <View style={styles.discountRow}>
                                        <Text style={styles.discountLabel}>Subtotal: R$ {calculateNewSubtotal().toFixed(2)}</Text>
                                    </View>

                                    <View style={styles.discountRow}>
                                        <Text style={styles.totalLabel}>Ajuste/Desconto (+/-):</Text>
                                        <PriceInput
                                            value={editedDiscount}
                                            onChange={setEditedDiscount}
                                            style={{ width: 80, borderColor: Colors.border }}
                                        />
                                    </View>

                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Novo Total Final</Text>
                                        <Text style={styles.totalValue}>R$ {calculateNewTotal().toFixed(2)}</Text>
                                    </View>

                                    <TouchableOpacity style={styles.saveEditBtn} onPress={saveSaleChanges}>
                                        <Text style={styles.saveEditText}>Salvar Alterações</Text>
                                    </TouchableOpacity>

                                    {editingSale && editingSale.remainingBalance > 0 && (
                                        <TouchableOpacity
                                            style={styles.paySpecificBtn}
                                            onPress={handlePayFullSale}
                                        >
                                            <CheckCircle size={18} color={Colors.secondary} style={{ marginRight: 8 }} />
                                            <Text style={styles.paySpecificText}>
                                                Receber Total (R$ {editingSale.remainingBalance.toFixed(2)})
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSale}>
                                        <Trash2 size={18} color={Colors.danger} style={{ marginRight: 8 }} />
                                        <Text style={styles.deleteBtnText}>Excluir Venda</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    headerContainer: {
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 60 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    headerTextContainer: {
        flex: 1,
    },
    welcomeLabel: {
        fontSize: 16,
        color: Colors.text.muted,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: '500',
        marginBottom: 4,
    },
    userNameText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.text.light,
        letterSpacing: -0.5,
    },
    profileButton: {
        padding: 4,
    },
    avatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.text.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.text.secondary,
    },
    avatarTextSmall: {
        fontSize: 18,
        color: Colors.white,
        fontWeight: 'bold',
    },
    newSaleButton: {
        backgroundColor: Colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        marginHorizontal: 4,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    newSaleButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text.primary,
        letterSpacing: 0.5,
    },
    bodyContent: {
        flex: 1,
        padding: 24,
    },
    // Modals Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    editModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    payModalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    subTitle: { color: Colors.text.muted, fontSize: 13, marginTop: 4 },
    saveEditBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    saveEditText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
    bigInput: { fontSize: 32, fontWeight: 'bold', color: Colors.text.primary, textAlign: 'center', paddingVertical: 20, borderBottomWidth: 1, borderColor: Colors.border },

    // Additional styles for inner modal logic that wasn't extracted yet
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, paddingHorizontal: 12, borderRadius: 12, height: 50, marginBottom: 16 },
    searchInput: { flex: 1, height: '100%', fontSize: 16, color: Colors.text.primary },
    productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: Colors.border },
    productName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    productPrice: { color: Colors.primary, fontWeight: '600' },

    editItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: Colors.border },
    editItemName: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
    editControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { padding: 4, backgroundColor: Colors.background, borderRadius: 8 },
    qtyText: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, minWidth: 20, textAlign: 'center' },
    editItemTotal: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginTop: 4 },
    addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 12, borderWidth: 1, borderColor: Colors.secondary, borderRadius: 8, borderStyle: 'dashed' },
    addItemText: { color: Colors.secondary, fontWeight: '600' },

    editFooter: { marginTop: 20, borderTopWidth: 1, borderColor: Colors.border, paddingTop: 20 },
    discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    discountLabel: { fontSize: 14, color: Colors.text.secondary },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },

    paySpecificBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 12, backgroundColor: Colors.secondaryLight, borderRadius: 12 },
    paySpecificText: { color: Colors.secondary, fontWeight: 'bold' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 24 },
    deleteBtnText: { color: Colors.danger, fontWeight: 'bold' },

    priceInputSmall: { minWidth: 60, textAlign: 'right', fontSize: 14, color: Colors.text.primary, fontWeight: 'bold', borderBottomWidth: 1, borderColor: Colors.text.muted, padding: 0 }
});
