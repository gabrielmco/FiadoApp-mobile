import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    Platform,
    Modal,
    TextInput,
    Alert,
    ScrollView,
    KeyboardAvoidingView
} from 'react-native';
import { Plus, History, User, Package, Users, CheckCircle, Wallet, X, Minus, Trash2, Search, Pencil } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { db } from '../../services/db';
import { Sale, PaymentRecord, Product } from '../../types';

// Componente para Input de Preço Seguro (Evita bugs de digitação)
const PriceInput = ({ value, onChange, style }: { value: number, onChange: (val: number) => void, style?: any }) => {
    const [text, setText] = useState(value.toFixed(2));

    const handleEndEditing = () => {
        const val = parseFloat(text.replace(',', '.')) || 0;
        onChange(val);
        setText(val.toFixed(2)); // Formata bonitinho ao sair
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
    const router = useRouter();
    const [historyTab, setHistoryTab] = useState<'ALL' | 'CASH' | 'CREDIT'>('ALL');
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<(PaymentRecord & { clientName: string })[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
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
            const [salesData, paymentsData, productsData] = await Promise.all([
                db.getSales(),
                db.getAllPayments(),
                db.getProducts()
            ]);
            setSales(salesData);
            setPayments(paymentsData);
            setProducts(productsData);
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
        if (historyTab === 'CASH') return isSale ? (item as Sale).type === 'CASH' : true; // Pagamentos são "Cash" flow
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
        setEditedItems(sale.items.map(i => ({ ...i })));
        setEditedDiscount(sale.discountOrAdjustment || 0);
        setIsEditModalOpen(true);
        setShowProductList(false); // Reset visual state
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
            loadData(); // Reload logic
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

    const renderItem = ({ item }: { item: any }) => {
        // PAGAMENTO (CLICÁVEL)
        if (!('items' in item)) {
            const payment = item as (PaymentRecord & { clientName: string });
            return (
                <TouchableOpacity onPress={() => openPaymentModal(payment)} activeOpacity={0.7}>
                    <View style={[styles.saleCard, styles.paymentCardBorder]}>
                        <View style={styles.saleCardLeft}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0FDF4' }]}>
                                <Wallet size={20} color="#16A34A" />
                            </View>
                            <View>
                                <Text style={styles.saleClientName}>{payment.clientName}</Text>
                                <Text style={styles.saleInfo}>
                                    {new Date(payment.timestamp).toLocaleDateString('pt-BR')} • {new Date(payment.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Text style={[styles.saleItemsText, { color: '#16A34A', fontWeight: '500' }]}>
                                    Recebimento de Dívida
                                </Text>
                            </View>
                        </View>
                        <View style={styles.saleCardRight}>
                            <Text style={[styles.saleTotal, { color: '#16A34A' }]}>+ R$ {payment.amount.toFixed(2).replace('.', ',')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                <Pencil size={14} color="#16A34A" />
                                <View style={[styles.statusBadge, styles.statusBadgeCash]}>
                                    <Text style={[styles.statusText, styles.statusTextCash]}>Recebido</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        // VENDA (Clicável)
        const sale = item as Sale;
        return (
            <TouchableOpacity onPress={() => openEditModal(sale)} activeOpacity={0.7}>
                <View style={styles.saleCard}>
                    <View style={styles.saleCardLeft}>
                        <View style={styles.avatarPlaceholder}>
                            <User size={20} color="#203A43" />
                        </View>
                        <View>
                            <Text style={styles.saleClientName}>{sale.clientName}</Text>
                            <Text style={styles.saleInfo}>
                                {new Date(sale.timestamp).toLocaleDateString('pt-BR')} • {new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={styles.saleItemsText} numberOfLines={2}>
                                {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}: {sale.items.map(i => i.productName).join(', ')}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.saleCardRight}>
                        <Text style={styles.saleTotal}>R$ {sale.finalTotal.toFixed(2).replace('.', ',')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <Pencil size={14} color="#9CA3AF" />
                            <View style={[styles.statusBadge, sale.type === 'CREDIT' ? styles.statusBadgeCredit : styles.statusBadgeCash]}>
                                <Text style={[styles.statusText, sale.type === 'CREDIT' ? styles.statusTextCredit : styles.statusTextCash]}>
                                    {sale.type === 'CREDIT' ? 'Pendente' : 'Pago'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Top Header Section */}
            <View style={styles.headerContainer}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.welcomeText}>Bem-vindo</Text>
                            <Text style={styles.brandText}>Gestor de Vendas</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.newSaleButton} onPress={() => router.push('/sales/new')}>
                        <Plus size={24} color="#203A43" style={{ marginRight: 8 }} />
                        <Text style={styles.newSaleButtonText}>Nova Venda</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            <View style={styles.bodyContent}>
                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/clients/new')}>
                        <Users size={24} color="#203A43" />
                        <Text style={styles.actionText}>Novo Cliente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/products/new')}>
                        <Package size={24} color="#203A43" />
                        <Text style={styles.actionText}>Novo Produto</Text>
                    </TouchableOpacity>
                </View>

                {/* History Section */}
                <View style={styles.historySection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <History size={20} color="#4B5563" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Histórico Recente</Text>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tab, historyTab === 'ALL' && styles.activeTab]}
                            onPress={() => setHistoryTab('ALL')}
                        >
                            <Text style={[styles.tabText, historyTab === 'ALL' && styles.activeTabText]}>Tudo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, historyTab === 'CASH' && styles.activeTab]}
                            onPress={() => setHistoryTab('CASH')}
                        >
                            <Text style={[styles.tabText, historyTab === 'CASH' && styles.activeTabText]}>À Vista / Receb.</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, historyTab === 'CREDIT' && styles.activeTab]}
                            onPress={() => setHistoryTab('CREDIT')}
                        >
                            <Text style={[styles.tabText, historyTab === 'CREDIT' && styles.activeTabText]}>A Prazo</Text>
                        </TouchableOpacity>
                    </View>

                    {/* List */}
                    <FlatList
                        data={filteredHistory}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                        ListEmptyComponent={() => (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#9CA3AF' }}>Nenhuma venda ou pagamento recente.</Text>
                            </View>
                        )}
                        style={{ flex: 1 }}
                    />
                </View>
            </View>

            {/* MODAL EDIÇÃO DE PAGAMENTO */}
            <Modal visible={!!editingPayment} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={[styles.editModalContent, { maxHeight: 'auto' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={styles.payModalTitle}>Editar Pagamento</Text>
                            <TouchableOpacity onPress={() => setEditingPayment(null)}>
                                <X size={24} color="#000" />
                            </TouchableOpacity>
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
                            <TouchableOpacity style={[styles.saveEditBtn, { flex: 1, backgroundColor: '#EF4444' }]} onPress={handleDeletePayment}>
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
                            <TouchableOpacity onPress={() => {
                                if (showProductList) setShowProductList(false); // Voltar
                                else setIsEditModalOpen(false); // Fechar
                            }}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* CONTEÚDO: LISTA DE PRODUTOS PARA ADICIONAR */}
                        {showProductList ? (
                            <View style={{ flex: 1 }}>
                                <View style={styles.searchBox}>
                                    <Search size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Buscar produto..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoFocus
                                    />
                                </View>
                                <FlatList
                                    data={filteredProducts}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.productItem} onPress={() => handleAddItem(item)}>
                                            <View>
                                                <Text style={styles.productName}>{item.name}</Text>
                                                <Text style={styles.productPrice}>R$ {item.price.toFixed(2)}</Text>
                                            </View>
                                            <Plus size={20} color="#16A34A" />
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            </View>
                        ) : (
                            // CONTEÚDO: LISTA DE ITENS DA VENDA A SER EDITADA
                            <>
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
                                        <Plus size={20} color="#16A34A" style={{ marginRight: 8 }} />
                                        <Text style={styles.addItemText}>Adicionar Item</Text>
                                    </TouchableOpacity>
                                </ScrollView>

                                <View style={styles.editFooter}>
                                    <View style={styles.discountRow}>
                                        <Text style={styles.discountLabel}>Subtotal: R$ {calculateNewSubtotal().toFixed(2)}</Text>
                                    </View>

                                    <View style={styles.discountRow}>
                                        <Text style={styles.totalLabel}>Ajuste/Desconto (+/-):</Text>
                                        <PriceInput
                                            value={editedDiscount}
                                            onChange={setEditedDiscount}
                                            style={{ width: 80, borderColor: '#ccc' }}
                                        />
                                    </View>

                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Novo Total Final</Text>
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

                                    {/* BOTÃO DE EXCLUIR */}
                                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSale}>
                                        <Trash2 size={18} color="#EF4444" style={{ marginRight: 8 }} />
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
        backgroundColor: '#F3F4F6',
    },
    headerContainer: {
        backgroundColor: '#203A43',
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    headerContent: {
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    brandText: {
        fontSize: 14,
        color: '#A0AEC0',
    },
    newSaleButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    newSaleButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#203A43',
    },
    bodyContent: {
        flex: 1,
        padding: 20,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    actionText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    historySection: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    tabText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#203A43',
        fontWeight: 'bold',
    },
    saleCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    saleCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E6FFFA',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    saleClientName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    saleInfo: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 2,
    },
    saleItemsText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    saleCardRight: {
        alignItems: 'flex-end',
    },
    saleTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusBadgeCredit: {
        backgroundColor: '#FEF2F2',
    },
    statusBadgeCash: {
        backgroundColor: '#F0FDF4',
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    statusTextCredit: {
        color: '#EF4444',
    },
    statusTextCash: {
        color: '#16A34A',
    },
    paymentCardBorder: {
        borderWidth: 1,
        borderColor: '#BBF7D0', // Green-200 like
        backgroundColor: '#F0FDF4', // Green-50 like
    },

    // MODAL STYLES
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    editModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    payModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    subTitle: { fontSize: 12, color: '#9CA3AF' },
    editItemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    editItemName: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
    editControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8 },
    qtyText: { fontSize: 16, fontWeight: 'bold' },
    priceInputSmall: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 8, width: 60, textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
    bigInput: { fontSize: 32, borderBottomWidth: 2, borderColor: '#203A43', paddingVertical: 8, textAlign: 'center', color: '#111', width: '100%' },
    editItemTotal: { fontSize: 16, fontWeight: 'bold', color: '#203A43', marginTop: 4 },
    editFooter: { marginTop: 20 },
    discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    discountLabel: { fontSize: 14, color: '#6B7280' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8, borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 12 },
    totalLabel: { fontSize: 16, color: '#6B7280' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#203A43' },
    saveEditBtn: { backgroundColor: '#203A43', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveEditText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
    paySpecificBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
    paySpecificText: { color: '#16A34A', fontWeight: 'bold', fontSize: 16 },

    deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    deleteBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },

    // Add Item Styles
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
    searchInput: { flex: 1, fontSize: 16, color: '#1F2937' },
    productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    productName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    productPrice: { fontSize: 14, color: '#16A34A', fontWeight: '600' },
    addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 16, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#16A34A', borderStyle: 'dashed' },
    addItemText: { color: '#16A34A', fontWeight: 'bold', fontSize: 14 }
});
