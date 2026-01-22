import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    Platform,
    Alert,
    Modal,
    KeyboardAvoidingView,
    ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, Plus, ShoppingCart, ArrowRight, X, Trash2, User, Filter, Minus, Check, Tag } from 'lucide-react-native';
import { db } from '../../services/db';
import { Product, CartItem, Client } from '../../types';

export default function NewSaleScreen() {
    const router = useRouter();

    // --- STATE ---
    const [products, setProducts] = useState<Product[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const [saleType, setSaleType] = useState<'CASH' | 'CREDIT'>('CASH');
    const [searchQuery, setSearchQuery] = useState('');

    // Modais
    const [showCartModal, setShowCartModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Todos');

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Ajuste manual no total final
    const [manualAdjustment, setManualAdjustment] = useState(0);

    // Modal de Edição Manual (Preço ou Total)
    const [inputModalVisible, setInputModalVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputType, setInputType] = useState<'ITEM_PRICE' | 'TOTAL_OVERRIDE'>('ITEM_PRICE');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- LOAD DATA ---
    useFocusEffect(
        useCallback(() => {
            loadResources();
        }, [])
    );

    const loadResources = async () => {
        try {
            const [prods, cli] = await Promise.all([db.getProducts(), db.getClients()]);
            if (prods && prods.length > 0) setProducts(prods);
            if (cli) setClients(cli);
        } catch (e) {
            console.error("Error loading resources:", e);
        } finally {
            setLoading(false);
        }
    };

    // Reseta o ajuste manual se esvaziar o carrinho
    useEffect(() => {
        if (cart.length === 0) {
            setManualAdjustment(0);
        }
    }, [cart]);

    // --- CRUD CARRINHO ---

    const addToCart = (product: Product) => {
        setCart(current => {
            const existing = current.find(item => item.id === product.id);
            if (existing) {
                return current.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...current, { ...product, quantity: 1, originalPrice: product.price }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(current => {
            return current.map(item => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    const removeFromCart = (id: string) => {
        setCart(current => current.filter(item => item.id !== id));
    };

    // Ajuste Fino do Total (+/- R$ 1.00)
    const adjustTotal = (delta: number) => {
        setManualAdjustment(prev => {
            const newAdj = prev + delta;
            if (cartSubtotal + newAdj < 0) return -cartSubtotal;
            return newAdj;
        });
    };

    // --- LÓGICA DO MODAL DE INPUT ---

    const handlePriceClick = (item: CartItem) => {
        setEditingItemId(item.id);
        setInputValue(item.price.toFixed(2));
        setInputType('ITEM_PRICE');
        setInputModalVisible(true);
    };

    const handleTotalClick = () => {
        setInputValue(finalTotal.toFixed(2));
        setInputType('TOTAL_OVERRIDE');
        setInputModalVisible(true);
    };

    // Nova função para os botões +/- dentro do modal de input
    const adjustInputValue = (delta: number) => {
        const current = parseFloat(inputValue.replace(',', '.') || '0');
        const nextVal = Math.max(0, current + delta);
        setInputValue(nextVal.toFixed(2));
    };

    const confirmInput = () => {
        const val = parseFloat(inputValue.replace(',', '.')) || 0;

        if (inputType === 'ITEM_PRICE' && editingItemId) {
            setCart(current => current.map(item => {
                if (item.id === editingItemId) return { ...item, price: val };
                return item;
            }));
        } else if (inputType === 'TOTAL_OVERRIDE') {
            const currentSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            setManualAdjustment(val - currentSubtotal);
        }
        setInputModalVisible(false);
        setEditingItemId(null);
    };

    // --- CÁLCULOS ---
    const cartSubtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [cart]);

    const cartOriginalTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    }, [cart]);

    const finalTotal = Math.max(0, cartSubtotal + manualAdjustment);
    const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    // Cálculo do desconto total (Preço Tabela - Preço Final)
    const totalDiscountValue = cartOriginalTotal - finalTotal;

    const filteredProducts = useMemo(() => {
        let result = products;
        if (searchQuery) {
            result = result.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (activeCategory !== 'Todos') {
            result = result.filter(p => p.department === activeCategory);
        }
        return result;
    }, [products, searchQuery, activeCategory]);

    const categories = useMemo(() => {
        const deps = products.map(p => p.department || 'Geral');
        return ['Todos', ...Array.from(new Set(deps))];
    }, [products]);

    // --- FINALIZAÇÃO ---
    const handleFinalize = async () => {
        if (cart.length === 0) return;
        if (saleType === 'CREDIT' && !selectedClient) {
            Alert.alert("Atenção", "Selecione um cliente para venda a prazo.");
            return;
        }

        try {
            const saleData = {
                clientId: selectedClient?.id,
                clientName: selectedClient?.name || 'Avulso',
                type: saleType,
                subtotal: cartSubtotal,
                discountOrAdjustment: totalDiscountValue,
                finalTotal: finalTotal,
                remainingBalance: saleType === 'CREDIT' ? finalTotal : 0,
                status: saleType === 'CREDIT' ? 'PENDING' : 'PAID',
                items: cart.map(i => ({
                    productId: i.id,
                    productName: i.name,
                    quantity: i.quantity,
                    unitPrice: i.price,
                    total: i.price * i.quantity
                }))
            };

            // @ts-ignore
            await db.createSale(saleData);
            Alert.alert("Sucesso", "Venda finalizada!");
            router.back();
        } catch (e) {
            Alert.alert("Erro", "Falha ao salvar venda.");
        }
    };

    // --- RENDERIZADORES ---

    const renderProductItem = ({ item }: { item: Product }) => {
        const cartItem = cart.find(c => c.id === item.id);
        const qty = cartItem ? cartItem.quantity : 0;

        return (
            <View style={[styles.productItem, qty > 0 && styles.productItemActive]}>
                <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => addToCart(item)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productDetails}>
                        {currencyFormatter.format(item.price)} • {item.unit}
                    </Text>
                    {item.department && (
                        <View style={styles.deptBadge}>
                            <Text style={styles.deptText}>{item.department}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {qty > 0 ? (
                    <View style={styles.qtyControlRow}>
                        <TouchableOpacity
                            style={styles.qtyMiniBtn}
                            onPress={() => updateQuantity(item.id, -1)}
                        >
                            <Minus size={16} color="#FFF" />
                        </TouchableOpacity>

                        <Text style={styles.qtyLabelList}>{qty}</Text>

                        <TouchableOpacity
                            style={styles.qtyMiniBtn}
                            onPress={() => updateQuantity(item.id, 1)}
                        >
                            <Plus size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
                        <Plus size={24} color="#FFF" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const DiscountDisplay = () => {
        if (totalDiscountValue <= 0.01 && totalDiscountValue >= -0.01) return null;

        const isDiscount = totalDiscountValue > 0;
        return (
            <View style={styles.discountBadgeContainer}>
                <Tag size={12} color={isDiscount ? "#16A34A" : "#EA580C"} />
                <Text style={[styles.discountText, { color: isDiscount ? "#16A34A" : "#EA580C" }]}>
                    {isDiscount ? "Desconto: " : "Acréscimo: "}
                    {currencyFormatter.format(Math.abs(totalDiscountValue))}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>

                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                            <X size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Nova Venda</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, saleType === 'CASH' && styles.toggleBtnActive]}
                            onPress={() => setSaleType('CASH')}
                        >
                            <Text style={[styles.toggleText, saleType === 'CASH' && styles.toggleTextActive]}>À Vista</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, saleType === 'CREDIT' && styles.toggleBtnActive]}
                            onPress={() => setSaleType('CREDIT')}
                        >
                            <Text style={[styles.toggleText, saleType === 'CREDIT' && styles.toggleTextActive]}>A Prazo</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => setShowClientModal(true)} style={styles.clientBar}>
                        <User size={18} color="#4B5563" />
                        <Text style={styles.clientBarText}>
                            {selectedClient ? selectedClient.name : 'Selecionar Cliente (Opcional)'}
                        </Text>
                        {selectedClient ? (
                            <TouchableOpacity onPress={() => setSelectedClient(null)}>
                                <X size={18} color="#EF4444" />
                            </TouchableOpacity>
                        ) : (
                            <ArrowRight size={18} color="#9CA3AF" />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <View style={styles.inputWrapper}>
                            <Search size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar produto..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.filterBtn, activeCategory !== 'Todos' && styles.filterBtnActive]}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <Filter size={20} color={activeCategory !== 'Todos' ? "#FFF" : "#203A43"} />
                        </TouchableOpacity>
                    </View>
                    {activeCategory !== 'Todos' && (
                        <View style={styles.activeFilterTag}>
                            <Text style={styles.activeFilterText}>Filtro: {activeCategory}</Text>
                            <TouchableOpacity onPress={() => setActiveCategory('Todos')}>
                                <X size={14} color="#FFF" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id}
                    renderItem={renderProductItem}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyState}>
                                <ShoppingCart size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
                                <TouchableOpacity
                                    style={styles.emptyActionBtn}
                                    onPress={() => router.push('/products/new')}
                                >
                                    <Text style={styles.emptyActionText}>Cadastrar Produto</Text>
                                </TouchableOpacity>
                            </View>
                        ) : <ActivityIndicator style={{ marginTop: 40 }} color="#203A43" />
                    }
                />

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.footer}>
                        <View>
                            <DiscountDisplay />
                            <Text style={styles.totalLabel}>Total Estimado</Text>
                            <Text style={styles.totalValue}>{currencyFormatter.format(finalTotal)}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.reviewButton, cart.length === 0 && styles.reviewButtonDisabled]}
                            onPress={() => setShowCartModal(true)}
                            disabled={cart.length === 0}
                        >
                            <Text style={styles.reviewButtonText}>Revisar ({totalItemsCount})</Text>
                            <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

            </SafeAreaView>

            {/* --- MODAL DE REVISÃO DO CARRINHO --- */}
            <Modal visible={showCartModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Itens da Venda</Text>
                        <TouchableOpacity onPress={() => setShowCartModal(false)} style={styles.closeModalIcon}>
                            <X size={28} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={cart}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                        renderItem={({ item }) => (
                            <View style={styles.largeCartItem}>
                                <View style={styles.cartItemTop}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.largeItemName}>{item.name}</Text>
                                        <Text style={styles.itemQtyLabel}>
                                            Tabela: {currencyFormatter.format(item.originalPrice)}
                                            {item.price < item.originalPrice && <Text style={{ color: '#16A34A', fontWeight: 'bold' }}> (Desc.)</Text>}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.trashBtn}
                                        onPress={() => removeFromCart(item.id)}
                                    >
                                        <Trash2 size={22} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.priceControlRow}>
                                    <View style={styles.stepperContainer}>
                                        <TouchableOpacity
                                            style={styles.stepBtn}
                                            onPress={() => updateQuantity(item.id, -1)}
                                        >
                                            <Minus size={24} color="#374151" />
                                        </TouchableOpacity>

                                        <View style={styles.qtyDisplayBox}>
                                            <Text style={styles.qtyDisplayText}>{item.quantity}</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.stepBtn, styles.stepBtnAdd]}
                                            onPress={() => updateQuantity(item.id, 1)}
                                        >
                                            <Plus size={24} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* BOTÃO VERDE COM PREÇO UNITÁRIO E TOTAL */}
                                    <TouchableOpacity onPress={() => handlePriceClick(item)} style={styles.priceEditBtn}>
                                        <Text style={styles.unitPriceLabel}>{currencyFormatter.format(item.price)} un</Text>
                                        <Text style={styles.itemTotalText}>
                                            = {currencyFormatter.format(item.price * item.quantity)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />

                    <View style={styles.modalFooter}>
                        <View style={styles.totalControlRow}>
                            <View>
                                <DiscountDisplay />
                                <Text style={styles.summaryLabel}>Total Final</Text>
                            </View>

                            <View style={styles.totalAdjuster}>
                                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTotal(-1)}>
                                    <Minus size={24} color="#374151" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleTotalClick}>
                                    <Text style={styles.summaryValue}>{currencyFormatter.format(finalTotal)}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTotal(1)}>
                                    <Plus size={24} color="#374151" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.finalizeButton} onPress={handleFinalize}>
                            <Text style={styles.finalizeButtonText}>Confirmar Venda</Text>
                            <ArrowRight size={24} color="#fff" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL FILTRO --- */}
            <Modal visible={showFilterModal} transparent animationType="fade">
                <View style={styles.centeredModalBg}>
                    <View style={styles.filterCard}>
                        <View style={styles.dialogHeader}>
                            <Text style={styles.dialogTitle}>Filtrar por Departamento</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={categories}
                            keyExtractor={i => i}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.filterOption, activeCategory === item && styles.filterOptionActive]}
                                    onPress={() => {
                                        setActiveCategory(item);
                                        setShowFilterModal(false);
                                    }}
                                >
                                    <Text style={[styles.filterOptionText, activeCategory === item && styles.filterOptionTextActive]}>
                                        {item}
                                    </Text>
                                    {activeCategory === item && <Check size={18} color="#FFF" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* --- MODAL INPUT COM +/- --- */}
            <Modal visible={inputModalVisible} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centeredModalBg}>
                    <View style={styles.inputCard}>
                        <Text style={styles.inputLabel}>
                            {inputType === 'ITEM_PRICE' ? 'Editar Preço Unitário' : 'Editar Total da Venda'}
                        </Text>

                        {/* INPUT CERCADO POR BOTÕES +/- */}
                        <View style={styles.inputRow}>
                            <TouchableOpacity
                                style={styles.stepBtnLarge}
                                onPress={() => adjustInputValue(-0.5)}
                            >
                                <Minus size={32} color="#374151" />
                            </TouchableOpacity>

                            <TextInput
                                style={styles.bigInput}
                                value={inputValue}
                                onChangeText={setInputValue}
                                keyboardType="numeric"
                                autoFocus
                            />

                            <TouchableOpacity
                                style={[styles.stepBtnLarge, styles.stepBtnAdd]}
                                onPress={() => adjustInputValue(0.5)}
                            >
                                <Plus size={32} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setInputModalVisible(false)}>
                                <Text style={{ fontWeight: 'bold', color: '#666', fontSize: 16 }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={confirmInput}>
                                <Text style={{ fontWeight: 'bold', color: '#FFF', fontSize: 16 }}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={showClientModal} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Selecionar Cliente</Text>
                        <TouchableOpacity onPress={() => setShowClientModal(false)}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={clients}
                        keyExtractor={c => c.id}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.clientItem} onPress={() => { setSelectedClient(item); setShowClientModal(false) }}>
                                <Text style={styles.clientName}>{item.name}</Text>
                                <Text style={{ color: item.totalDebt > 0 ? 'red' : 'green' }}>{item.totalDebt > 0 ? 'Deve' : 'Em dia'}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? 40 : 0, paddingBottom: 16 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    closeBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },

    toggleContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', marginHorizontal: 20, borderRadius: 12, padding: 4 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    toggleBtnActive: { backgroundColor: '#203A43' },
    toggleText: { fontWeight: '600', color: '#6B7280' },
    toggleTextActive: { color: '#fff' },

    clientBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
    clientBarText: { flex: 1, marginLeft: 12, color: '#374151', fontWeight: '500' },

    searchSection: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    searchContainer: { flexDirection: 'row', gap: 12 },
    inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: '#E5E7EB' },
    searchInput: { flex: 1, fontSize: 16, color: '#1F2937' },

    filterBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    filterBtnActive: { backgroundColor: '#203A43', borderColor: '#203A43' },
    activeFilterTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#203A43', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
    activeFilterText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    listContent: { padding: 20, paddingBottom: 100 },
    productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: 2, borderColor: 'transparent' },
    productItemActive: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },

    productName: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    productDetails: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    deptBadge: { alignSelf: 'flex-start', backgroundColor: '#E5E7EB', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 },
    deptText: { fontSize: 10, color: '#4B5563', fontWeight: 'bold' },

    addButton: { backgroundColor: '#203A43', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    qtyControlRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#203A43', borderRadius: 22, paddingHorizontal: 4, height: 44 },
    qtyMiniBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    qtyLabelList: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginHorizontal: 8 },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    totalLabel: { fontSize: 12, color: '#6B7280' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#203A43' },
    reviewButton: { backgroundColor: '#203A43', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
    reviewButtonDisabled: { backgroundColor: '#D1D5DB' },
    reviewButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#6B7280', marginVertical: 10 },
    emptyActionBtn: { backgroundColor: '#203A43', padding: 10, borderRadius: 8 },
    emptyActionText: { color: '#fff', fontWeight: 'bold' },

    modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },
    closeModalIcon: { padding: 8 },

    largeCartItem: { padding: 24, borderBottomWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FAFAFA', borderRadius: 12, marginBottom: 16 },
    cartItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    largeItemName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 12 },
    itemQtyLabel: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    trashBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },

    priceControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    stepBtnAdd: { backgroundColor: '#203A43' },

    qtyDisplayBox: { width: 50, height: 48, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    qtyDisplayText: { fontSize: 20, fontWeight: 'bold', color: '#111' },

    // BOTÃO VERDE MODIFICADO PARA MOSTRAR UNITÁRIO E TOTAL
    priceEditBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'flex-end', minWidth: 120 },
    unitPriceLabel: { fontSize: 12, color: '#15803D', marginBottom: 2 },
    itemTotalText: { fontSize: 18, fontWeight: 'bold', color: '#15803D' },

    modalFooter: { padding: 24, borderTopWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#fff' },
    totalControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    summaryLabel: { fontSize: 18, color: '#6B7280', fontWeight: '600' },
    totalAdjuster: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    adjBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    summaryValue: { fontSize: 32, fontWeight: 'bold', color: '#203A43' },
    finalizeButton: { backgroundColor: '#203A43', paddingVertical: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    finalizeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },

    centeredModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    filterCard: { backgroundColor: '#fff', width: '90%', borderRadius: 16, padding: 20, maxHeight: '60%' },
    dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    dialogTitle: { fontSize: 18, fontWeight: 'bold' },
    filterOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    filterOptionActive: { backgroundColor: '#203A43', paddingHorizontal: 12, borderRadius: 8 },
    filterOptionText: { fontSize: 16, color: '#374151' },
    filterOptionTextActive: { color: '#FFF', fontWeight: 'bold' },

    // ESTILOS DO MODAL DE INPUT COM +/-
    inputCard: { backgroundColor: '#fff', width: '100%', padding: 24, borderRadius: 16 },
    inputLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#374151', textAlign: 'center' },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
    stepBtnLarge: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    bigInput: { fontSize: 32, borderBottomWidth: 2, borderColor: '#203A43', paddingVertical: 8, textAlign: 'center', color: '#111', minWidth: 120 },
    inputActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    cancelBtn: { padding: 12 },
    confirmBtn: { backgroundColor: '#203A43', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },

    clientItem: { padding: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between' },
    clientName: { fontSize: 16, fontWeight: '500' },

    discountBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    discountText: { fontSize: 12, fontWeight: 'bold' }
});