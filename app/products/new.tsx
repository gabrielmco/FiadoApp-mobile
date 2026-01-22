import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, Trash2 } from 'lucide-react-native';
import { db } from '../../services/db';

const DEPARTMENTS = ['Ração', 'Medicamentos', 'Ferramentas', 'Acessórios', 'Outros'];
const ANIMAL_TYPES = ['Cachorro', 'Gato', 'Peixe', 'Porco', 'Boi', 'Bezerro', 'Aves'];
const UNITS = ['UN', 'KG', 'SC', 'CX', 'LT', 'PAR'];

export default function NewProductScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const isEditing = !!id;

    const [loadingData, setLoadingData] = useState(false);

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [department, setDepartment] = useState('Outros');
    const [animalType, setAnimalType] = useState('');
    const [unit, setUnit] = useState<any>('UN');

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'DEPT' | 'ANIMAL' | 'UNIT'>('DEPT');

    useEffect(() => {
        if (isEditing) {
            loadProductData();
        }
    }, [id]);

    const loadProductData = async () => {
        setLoadingData(true);
        try {
            const product = await db.getProduct(id as string);
            if (product) {
                setName(product.name);
                setPrice(product.price.toString());
                setCost(product.cost?.toString() || '');
                setDepartment(product.department || 'Outros');
                setAnimalType(product.animalType || '');
                setUnit(product.unit || 'UN');
            }
        } catch (e) {
            Alert.alert("Erro", "Falha ao carregar produto.");
        } finally {
            setLoadingData(false);
        }
    };

    const handleSave = async () => {
        if (!name || !price) {
            Alert.alert("Erro", "Nome e Preço são obrigatórios");
            return;
        }

        const productData = {
            name,
            price: parseFloat(price.replace(',', '.')) || 0,
            cost: parseFloat(cost.replace(',', '.')) || 0,
            department,
            animalType: (department === 'Ração' || department === 'Medicamentos') ? animalType : undefined,
            unit,
            trackStock: false
        };

        try {
            if (isEditing) {
                await db.updateProduct({ id: id as string, ...productData });
                Alert.alert("Sucesso", "Produto atualizado!");
            } else {
                await db.addProduct(productData);
                Alert.alert("Sucesso", "Produto cadastrado!");
            }
            router.back();
        } catch (e) {
            Alert.alert("Erro", "Falha ao salvar.");
        }
    };

    // FUNÇÃO DE EXCLUIR (Para limpar os produtos de exemplo)
    const handleDelete = () => {
        Alert.alert(
            "Excluir Produto",
            "Tem certeza? Essa ação não pode ser desfeita.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await db.deleteProduct(id as string);
                            router.back();
                        } catch (e: any) {
                            console.log(e);
                            if (e.code === '23503') { // Foreign Key Violation code
                                Alert.alert(
                                    "Não é possível excluir",
                                    "Este produto já foi vendido e faz parte do histórico de vendas. \n\nPara manter a integridade dos dados, você não pode excluí-lo permanentemente."
                                );
                            } else {
                                Alert.alert("Erro", "Não foi possível excluir: " + (e.message || "Erro desconhecido"));
                            }
                        }
                    }
                }
            ]
        );
    };

    const openSelector = (type: 'DEPT' | 'ANIMAL' | 'UNIT') => {
        setModalType(type);
        setModalVisible(true);
    };

    const handleSelection = (value: string) => {
        if (modalType === 'DEPT') {
            setDepartment(value);
            if (value !== 'Ração' && value !== 'Medicamentos') setAnimalType('');
        }
        if (modalType === 'ANIMAL') setAnimalType(value);
        if (modalType === 'UNIT') setUnit(value);
        setModalVisible(false);
    };

    const getOptions = () => {
        if (modalType === 'DEPT') return DEPARTMENTS;
        if (modalType === 'ANIMAL') return ANIMAL_TYPES;
        return UNITS;
    };

    if (loadingData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#203A43" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{isEditing ? 'Editar Produto' : 'Novo Produto'}</Text>
                    {isEditing ? (
                        <TouchableOpacity onPress={handleDelete}>
                            <Trash2 size={24} color="#EF4444" />
                        </TouchableOpacity>
                    ) : <View style={{ width: 24 }} />}
                </View>

                <ScrollView contentContainerStyle={styles.form}>
                    <Text style={styles.label}>Nome do Produto</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Ração Premium 15kg" placeholderTextColor="#9CA3AF" />

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Preço Venda (R$)</Text>
                            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="numeric" />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Custo (R$)</Text>
                            <TextInput style={styles.input} value={cost} onChangeText={setCost} placeholder="0.00" keyboardType="numeric" />
                        </View>
                    </View>

                    <Text style={styles.label}>Departamento</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => openSelector('DEPT')}>
                        <Text style={styles.selectorText}>{department}</Text>
                        <ChevronDown size={20} color="#6B7280" />
                    </TouchableOpacity>

                    {(department === 'Ração' || department === 'Medicamentos') && (
                        <>
                            <Text style={styles.label}>Tipo de Animal</Text>
                            <TouchableOpacity style={styles.selector} onPress={() => openSelector('ANIMAL')}>
                                <Text style={[styles.selectorText, !animalType && { color: '#9CA3AF' }]}>
                                    {animalType || 'Selecione...'}
                                </Text>
                                <ChevronDown size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </>
                    )}

                    <Text style={styles.label}>Unidade de Medida</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => openSelector('UNIT')}>
                        <Text style={styles.selectorText}>{unit}</Text>
                        <ChevronDown size={20} color="#6B7280" />
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <Text style={styles.saveBtnText}>{isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}</Text>
                    </TouchableOpacity>
                </View>

                <Modal visible={modalVisible} transparent animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Selecione uma opção</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {getOptions().map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={styles.modalOptionText}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB', paddingTop: Platform.OS === 'android' ? 40 : 20 },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    form: { padding: 20 },
    label: { fontWeight: 'bold', color: '#6B7280', marginBottom: 8, fontSize: 14, marginTop: 12 },
    input: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 16, color: '#1F2937' },
    row: { flexDirection: 'row', gap: 16 },
    halfInput: { flex: 1 },
    selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    selectorText: { fontSize: 16, color: '#1F2937' },
    footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
    saveBtn: { backgroundColor: '#203A43', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    modalOptionText: { fontSize: 16, color: '#374151', textAlign: 'center' }
});