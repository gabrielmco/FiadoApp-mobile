import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { Search, Plus, X, Filter } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Product } from '../../types';
import { db } from '../../services/db';
import { Colors } from '../../constants/colors';
import { ProductItem } from '../../components/products/ProductItem';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const DEPARTMENTS = ['Todos', 'Ração', 'Medicamentos', 'Ferramentas', 'Acessórios', 'Outros'];
const ANIMAL_TYPES = ['Todos', 'Cachorro', 'Gato', 'Peixe', 'Porco', 'Boi', 'Bezerro', 'Aves'];

export default function ProductsScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDept, setSelectedDept] = useState('Todos');
    const [selectedAnimal, setSelectedAnimal] = useState('Todos');

    // Função de carregar
    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await db.getProducts();
            // Ordenar por nome
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setProducts(sorted);
        } catch (error) {
            console.error("Erro ao carregar produtos", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadProducts();
        }, [loadProducts])
    );

    const filteredProducts = useMemo(() => {
        const searchText = normalizeText(search);
        return products.filter(p => {
            const matchesSearch = normalizeText(p.name).includes(searchText);
            const matchesDept = selectedDept === 'Todos' || p.department === selectedDept;
            const matchesAnimal = selectedAnimal === 'Todos' || (!p.animalType && selectedAnimal === 'Todos') || p.animalType === selectedAnimal;

            return matchesSearch && matchesDept && matchesAnimal;
        });
    }, [products, search, selectedDept, selectedAnimal]);

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                title="Produtos"
                showBackButton={false} // Tabs don't need back button usually, but consistent header is good. 
                // Wait, if it's a tab screen, maybe we don't want back button?
                // But we want consistent styling.
                rightAction={
                    <TouchableOpacity
                        style={styles.addButton} // We might need to adjust styling if it's inside header right container
                        onPress={() => router.push('/products/new')}
                    >
                        <Plus size={24} color={Colors.white} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.searchContainer}>
                <Search size={20} color={Colors.text.muted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar produto..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={Colors.text.muted}
                />
            </View>

            <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setModalVisible(true)}
            >
                <Filter size={20} color={Colors.primary} />
                <Text style={styles.filterBtnText}>
                    Filtros: {selectedDept} {selectedAnimal !== 'Todos' ? `• ${selectedAnimal}` : ''}
                </Text>
            </TouchableOpacity>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ProductItem
                            item={item}
                            onPress={(id) => router.push({ pathname: '/products/new', params: { id } })}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ marginTop: 20, color: Colors.text.muted }}>Nenhum produto encontrado.</Text>
                        </View>
                    }
                />
            )}

            {/* Modal de Filtros */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filtrar Produtos</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={Colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Departamento</Text>
                        <View style={styles.chipsContainer}>
                            {DEPARTMENTS.map(dept => (
                                <TouchableOpacity
                                    key={dept}
                                    style={[styles.chip, selectedDept === dept && styles.chipActive]}
                                    onPress={() => setSelectedDept(dept)}
                                >
                                    <Text style={[styles.chipText, selectedDept === dept && styles.chipTextActive]}>{dept}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Tipo de Animal</Text>
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

                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => setModalVisible(false)}
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
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'android' ? 40 : 0
    },
    header: {
        // Removed
    },
    title: {
        // Removed
    },
    addButton: {
        backgroundColor: Colors.primary,
        width: 40, // Smaller to fit header
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow removed/reduced for header context
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        marginHorizontal: 24,
        marginBottom: 12,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.text.primary,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        marginBottom: 16,
        backgroundColor: Colors.secondaryLight,
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    filterBtnText: {
        marginLeft: 8,
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: 12,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    chipActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },
    chipText: {
        color: Colors.text.secondary,
        fontSize: 14,
    },
    chipTextActive: {
        color: Colors.white,
        fontWeight: 'bold',
    },
    applyBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
    applyBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});