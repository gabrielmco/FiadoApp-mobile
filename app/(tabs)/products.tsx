import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { Search, Plus, X, Filter, Edit2, Package } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Product } from '../../types';
import { db } from '../../services/db';

const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const DEPARTMENTS = ['Todos', 'Ração', 'Medicamentos', 'Ferramentas', 'Acessórios', 'Outros'];
const ANIMAL_TYPES = ['Todos', 'Cachorro', 'Gato', 'Peixe', 'Porco', 'Boi', 'Bezerro', 'Aves'];

const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Optimized Item Component
const ProductItem = React.memo(({ item, onPress }: { item: Product; onPress: (id: string) => void }) => (
    <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onPress(item.id)}
    >
        <View style={styles.cardRow}>
            <View style={styles.iconContainer}>
                <Package size={24} color="#203A43" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <View style={styles.tagsContainer}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{item.department || 'Outros'}</Text>
                    </View>
                    {item.animalType && (
                        <View style={[styles.tag, styles.tagBlue]}>
                            <Text style={[styles.tagText, styles.textBlue]}>{item.animalType}</Text>
                        </View>
                    )}
                    <View style={[styles.tag, styles.tagGray]}>
                        <Text style={styles.tagText}>{item.unit}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardPrice}>
                <Text style={styles.priceText}>{formatCurrency(item.price)}</Text>
                <Edit2 size={16} color="#9CA3AF" style={{ marginTop: 4 }} />
            </View>
        </View>
    </TouchableOpacity>
));

export default function ProductsScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Filtros
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState('Todos');
    const [selectedAnimal, setSelectedAnimal] = useState('Todos');

    // Função de carregar
    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await db.getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadProducts();
        }, [])
    );

    const filtered = useMemo(() => {
        return products.filter(p => {
            const normalizedSearch = normalizeText(search);
            const matchesSearch =
                normalizeText(p.name).includes(normalizedSearch) ||
                normalizeText(p.department || '').includes(normalizedSearch);

            let matchesDept = true;
            if (selectedDept !== 'Todos') {
                matchesDept = p.department === selectedDept;
            }

            let matchesAnimal = true;
            if (selectedDept !== 'Todos' && (selectedDept === 'Ração' || selectedDept === 'Medicamentos')) {
                if (selectedAnimal !== 'Todos') {
                    if (selectedAnimal === 'Aves') {
                        const avesKeywords = ['ave', 'frango', 'galinha', 'pintinho'];
                        const animalTypeLower = (p.animalType || '').toLowerCase();
                        matchesAnimal = avesKeywords.some(k => animalTypeLower.includes(k));
                    } else {
                        matchesAnimal = (p.animalType || '').toLowerCase() === selectedAnimal.toLowerCase();
                    }
                }
            }

            return matchesSearch && matchesDept && matchesAnimal;
        });
    }, [products, search, selectedDept, selectedAnimal]);

    const handleProductPress = useCallback((id: string) => {
        router.push({ pathname: '/products/new', params: { id } });
    }, [router]);

    const renderProductItem = useCallback(({ item }: { item: Product }) => (
        <ProductItem item={item} onPress={handleProductPress} />
    ), [handleProductPress]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Produtos</Text>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar produto..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* Adjusted Button Style */}
            <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setIsFilterModalOpen(true)}
            >
                <View style={styles.filterBtnContent}>
                    <Filter size={18} color="#4B5563" />
                    <Text style={styles.filterBtnLabel}>
                        {selectedDept === 'Todos' ? 'Filtrar por Categoria' : `${selectedDept} ${selectedAnimal !== 'Todos' ? `> ${selectedAnimal}` : ''}`}
                    </Text>
                </View>
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator size="large" color="#203A43" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderProductItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Nenhum produto encontrado.</Text>
                    }
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => router.push('/products/new')}
            >
                <Plus size={32} color="#FFF" />
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
                            <Text style={styles.modalTitle}>Filtros</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                                <X size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.filterLabel}>Departamento</Text>
                        <View style={styles.chipsContainer}>
                            {DEPARTMENTS.map(dept => (
                                <TouchableOpacity
                                    key={dept}
                                    style={[styles.chip, selectedDept === dept && styles.chipActive]}
                                    onPress={() => {
                                        setSelectedDept(dept);
                                        setSelectedAnimal('Todos');
                                    }}
                                >
                                    <Text style={[styles.chipText, selectedDept === dept && styles.chipTextActive]}>{dept}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {(selectedDept === 'Ração' || selectedDept === 'Medicamentos') && (
                            <>
                                <Text style={[styles.filterLabel, { marginTop: 20 }]}>Tipo de Animal</Text>
                                <View style={styles.chipsContainer}>
                                    {ANIMAL_TYPES.map(animal => (
                                        <TouchableOpacity
                                            key={animal}
                                            style={[styles.chip, selectedAnimal === animal && styles.chipActive]}
                                            onPress={() => setSelectedAnimal(animal)}
                                        >
                                            <Text style={[styles.chipText, selectedAnimal === animal && styles.chipTextActive]}>{animal}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => setIsFilterModalOpen(false)}
                        >
                            <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 10, backgroundColor: '#fff' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1F2937' },

    searchContainer: {
        marginHorizontal: 24, marginVertical: 16, backgroundColor: '#FFF',
        borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
        height: 50, borderWidth: 1, borderColor: '#E5E7EB',
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: '100%', fontSize: 16, color: '#1F2937' },

    filterBtn: {
        marginHorizontal: 24, mb: 16, backgroundColor: '#FFF',
        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
        marginBottom: 16, // Ensure margin bottom
    },
    filterBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    filterBtnLabel: { fontWeight: '600', color: '#4B5563' },

    listContent: { paddingHorizontal: 24, paddingBottom: 100, gap: 12 },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },

    card: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center'
    },
    cardInfo: { flex: 1 },
    productName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    tagsContainer: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    tagText: { fontSize: 10, color: '#4B5563', fontWeight: 'bold' },
    tagBlue: { backgroundColor: '#EFF6FF' },
    textBlue: { color: '#1D4ED8' },
    tagGray: { backgroundColor: '#F3F4F6' },

    cardPrice: { alignItems: 'flex-end', justifyContent: 'center' },
    priceText: { fontWeight: 'bold', color: '#203A43', fontSize: 16 },

    fab: {
        position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#203A43', alignItems: 'center', justifyContent: 'center',
        elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },

    filterLabel: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: '#203A43' },
    chipText: { color: '#4B5563', fontWeight: '500' },
    chipTextActive: { color: '#FFF' },

    applyBtn: { marginTop: 30, backgroundColor: '#203A43', padding: 16, borderRadius: 12, alignItems: 'center' },
    applyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
