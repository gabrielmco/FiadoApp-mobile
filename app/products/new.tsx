import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, Trash2, Scan, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { db } from '../../services/db';
import { Colors } from '../../constants/colors';

const DEPARTMENTS = ['Ração', 'Medicamentos', 'Ferramentas', 'Acessórios', 'Outros'];
const ANIMAL_TYPES = ['Cachorro', 'Gato', 'Peixe', 'Porco', 'Boi', 'Bezerro', 'Aves'];
const UNITS = ['UN', 'KG', 'SC', 'CX', 'LT', 'PAR'];

export default function NewProductScreen() {
    const router = useRouter();
    const { id, barcode: initialBarcode } = useLocalSearchParams();
    const isEditing = !!id;

    const [loadingData, setLoadingData] = useState(false);

    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [department, setDepartment] = useState('Outros');
    const [animalType, setAnimalType] = useState('');
    const [unit, setUnit] = useState<any>('UN');

    // Checkbox / Toggle for Stock
    const [trackStock, setTrackStock] = useState(false);
    const [stock, setStock] = useState('');
    const [minStock, setMinStock] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'DEPT' | 'ANIMAL' | 'UNIT'>('DEPT');

    // Scanner
    const [isScanning, setIsScanning] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        if (isEditing) {
            loadProductData();
        } else if (initialBarcode) {
            // Se for cadastro novo vindo do Scanner
            setBarcode(initialBarcode as string);
        }
    }, [id, initialBarcode]);

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
                setBarcode(product.barcode || '');
                setTrackStock(product.trackStock || false);
                setStock(product.stock?.toString() || '');
                setMinStock(product.minStock?.toString() || '');
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

        const cleanBarcode = barcode ? barcode.trim() : "";

        // Validar unicidade do código de barras
        if (cleanBarcode) {
            setLoadingData(true); // Reusing loading state for feedback
            const existing = await db.getProductByBarcode(cleanBarcode);
            setLoadingData(false);

            if (existing && existing.id !== id) {
                Alert.alert("Duplicado", `O código ${cleanBarcode} já pertence ao produto "${existing.name}".`);
                return;
            }
        }

        const productData = {
            name,
            price: parseFloat(price.replace(',', '.')) || 0,
            cost: parseFloat(cost.replace(',', '.')) || 0,
            department,
            animalType: (department === 'Ração' || department === 'Medicamentos') ? animalType : undefined,
            unit,
            trackStock,
            stock: trackStock ? (parseInt(stock) || 0) : undefined,
            minStock: trackStock ? (parseInt(minStock) || 0) : undefined,
            barcode: cleanBarcode || null
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

    const handleBarCodeScanned = ({ type, data }: any) => {
        setScanned(true);
        setBarcode(data);
        setIsScanning(false);
        Alert.alert("Sucesso", "Código lido com sucesso!");
    };

    const startScan = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert("Erro", "Permissão da câmera negada.");
                return;
            }
        }
        setScanned(false);
        setIsScanning(true);
    };

    if (loadingData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={Colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{isEditing ? 'Editar Produto' : 'Novo Produto'}</Text>
                    {isEditing ? (
                        <TouchableOpacity onPress={handleDelete}>
                            <Trash2 size={24} color={Colors.danger} />
                        </TouchableOpacity>
                    ) : <View style={{ width: 24 }} />}
                </View>

                <ScrollView contentContainerStyle={styles.form}>
                    <Text style={styles.label}>Código de Barras (Opcional)</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={barcode}
                            onChangeText={setBarcode}
                            placeholder="Escaneie ou digite..."
                            placeholderTextColor={Colors.text.muted}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
                            <Scan size={24} color={Colors.white} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Nome do Produto</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Ração Premium 15kg" placeholderTextColor={Colors.text.muted} />

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
                        <ChevronDown size={20} color={Colors.text.secondary} />
                    </TouchableOpacity>

                    {(department === 'Ração' || department === 'Medicamentos') && (
                        <>
                            <Text style={styles.label}>Tipo de Animal</Text>
                            <TouchableOpacity style={styles.selector} onPress={() => openSelector('ANIMAL')}>
                                <Text style={[styles.selectorText, !animalType && { color: Colors.text.muted }]}>
                                    {animalType || 'Selecione...'}
                                </Text>
                                <ChevronDown size={20} color={Colors.text.secondary} />
                            </TouchableOpacity>
                        </>
                    )}

                    <Text style={styles.label}>Unidade de Medida</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => openSelector('UNIT')}>
                        <Text style={styles.selectorText}>{unit}</Text>
                        <ChevronDown size={20} color={Colors.text.secondary} />
                    </TouchableOpacity>

                    {/* ESTOQUE */}
                    <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.text.primary }}>Controlar Estoque?</Text>
                        <TouchableOpacity
                            onPress={() => setTrackStock(!trackStock)}
                            style={{
                                width: 50, height: 28, borderRadius: 14,
                                backgroundColor: trackStock ? Colors.secondary : Colors.border,
                                justifyContent: 'center', paddingHorizontal: 2
                            }}
                        >
                            <View style={{
                                width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.white,
                                alignSelf: trackStock ? 'flex-end' : 'flex-start'
                            }} />
                        </TouchableOpacity>
                    </View>

                    {trackStock && (
                        <View style={[styles.row, { marginTop: 12 }]}>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Estoque Atual</Text>
                                <TextInput
                                    style={styles.input}
                                    value={stock}
                                    onChangeText={setStock}
                                    placeholder="0"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Estoque Mínimo (Alerta)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={minStock}
                                    onChangeText={setMinStock}
                                    placeholder="5"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    )}
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

                <Modal visible={isScanning} animationType="slide">
                    <View style={{ flex: 1, backgroundColor: 'black' }}>
                        <CameraView
                            style={{ flex: 1 }}
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"],
                            }}
                        >
                            <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 50, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => setIsScanning(false)}
                                    style={{ backgroundColor: 'white', padding: 20, borderRadius: 50 }}
                                >
                                    <X size={24} color="black" />
                                </TouchableOpacity>
                                <Text style={{ color: 'white', marginTop: 20, fontWeight: 'bold' }}>Aponte para o código de barras</Text>
                            </View>
                        </CameraView>
                    </View>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.white, borderBottomWidth: 1, borderColor: Colors.border, paddingTop: Platform.OS === 'android' ? 40 : 20 },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    form: { padding: 20 },
    label: { fontWeight: 'bold', color: Colors.text.secondary, marginBottom: 8, fontSize: 14, marginTop: 12 },
    input: { backgroundColor: Colors.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 16, color: Colors.text.primary },
    row: { flexDirection: 'row', gap: 16 },
    halfInput: { flex: 1 },
    selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
    selectorText: { fontSize: 16, color: Colors.text.primary },
    footer: { padding: 20, backgroundColor: Colors.white, borderTopWidth: 1, borderColor: Colors.border },
    saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 },
    modalContent: { backgroundColor: Colors.white, borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderColor: Colors.background },
    modalOptionText: { fontSize: 16, color: Colors.text.secondary, textAlign: 'center' },
    scanBtn: { backgroundColor: Colors.primary, width: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }
});