import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { db } from '../../services/db';

export default function NewClientScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        phone: '',
        address: '',
        neighborhood: ''
    });

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Erro', 'O nome do cliente é obrigatório.');
            return;
        }

        try {
            setLoading(true);
            await db.addClient({
                name: formData.name,
                cpf: formData.cpf || undefined,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
                neighborhood: formData.neighborhood || undefined,
                credit: 0
            });

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#203A43" />
                </TouchableOpacity>
                <Text style={styles.title}>Novo Cliente</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nome do Cliente *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Maria da Silva"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Telefone / WhatsApp</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="(00) 00000-0000"
                            keyboardType="phone-pad"
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Endereço</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Rua, Número"
                            value={formData.address}
                            onChangeText={(text) => setFormData({ ...formData, address: text })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bairro</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome do Bairro"
                            value={formData.neighborhood}
                            onChangeText={(text) => setFormData({ ...formData, neighborhood: text })}
                        />
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <Save size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.saveButtonText}>
                            {loading ? 'Salvando...' : 'Salvar Cliente'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? 40 : 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    form: {
        padding: 20,
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    footer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    saveButton: {
        backgroundColor: '#203A43',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});