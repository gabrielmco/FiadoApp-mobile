import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { db } from '../../services/db';

export default function SettingsScreen() {
    const { user, signOut, updateProfile, deleteAccount } = useAuth();
    const router = useRouter();

    // State
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.user_metadata?.full_name || '');
    const [loading, setLoading] = useState(false);
    const [backupLoading, setBackupLoading] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Sync state with user data when it loads
    React.useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setNewName(user.user_metadata.full_name);
        }
        loadSettings();
    }, [user]);

    const loadSettings = async () => {
        try {
            const settings = await db.getSettings();
            if (settings['notifications_enabled']) {
                setNotificationsEnabled(settings['notifications_enabled'] === 'true');
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };

    const toggleNotifications = async () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        try {
            await db.saveSetting('notifications_enabled', String(newValue));
        } catch (e) {
            console.error("Failed to save setting", e);
        }
    };

    // Get initials for avatar
    const getInitials = () => {
        const name = user?.user_metadata?.full_name || user?.email || 'U';
        return name.substring(0, 2).toUpperCase();
    };

    const handleUpdateProfile = async () => {
        if (!newName.trim()) return;
        setLoading(true);
        try {
            const { error } = await updateProfile(newName.trim());
            if (error) {
                Alert.alert('Erro', 'Não foi possível atualizar o perfil: ' + error.message);
            } else {
                setEditingName(false);
                Alert.alert('Sucesso', 'Perfil atualizado!');
            }
        } catch (e) {
            Alert.alert('Erro', 'Erro inesperado: ' + e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Sair',
            'Tem certeza que deseja sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/auth/login');
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Apagar Conta',
            'Tem certeza absoluta? Esta ação é irreversível e apagará todos os seus dados.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'APAGAR TUDO',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { error } = await deleteAccount();
                            if (error) {
                                Alert.alert('Erro', 'Não foi possível apagar a conta. Verifique se a função RPC "delete_user" está criada no Supabase.\n\nDetalhe: ' + error.message);
                            } else {
                                Alert.alert('Conta Apagada', 'Sua conta foi removida com sucesso.');
                                router.replace('/auth/login');
                            }
                        } catch (e) {
                            Alert.alert('Erro', 'Erro inesperado: ' + e);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleExportBackup = async () => {
        try {
            setBackupLoading(true);
            const json = await db.exportBackup();

            // Share as text message directly (Works better on Android/iOS without file permission issues)
            await Share.share({
                message: json,
                title: 'Backup Gestor de Vendas'
            });

        } catch (error) {
            Alert.alert('Erro', 'Falha ao criar backup: ' + error);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleImportBackup = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });

            if (result.canceled) return;

            const file = result.assets[0];
            setBackupLoading(true);

            const json = await FileSystem.readAsStringAsync(file.uri);
            await db.importBackup(json);

            Alert.alert('Sucesso', 'Dados restaurados com sucesso!');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao restaurar backup. Verifique se o arquivo é válido.');
            console.error(error);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleImportClientsCSV = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'text/comma-separated-values' }); // Or 'text/csv'
            if (result.canceled) return;

            setBackupLoading(true);
            const file = result.assets[0];
            const content = await FileSystem.readAsStringAsync(file.uri);

            const { success, errors } = await db.importClientsFromCSV(content);
            Alert.alert(
                'Importação Concluída',
                `Sucesso: ${success}\nErros: ${errors}\n\nVerifique se o CSV usa os cabeçalhos: nome, telefone, endereco, bairro, cpf, credito.`
            );
        } catch (e) {
            Alert.alert('Erro', 'Falha na importação: ' + e);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleImportProductsCSV = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'text/comma-separated-values' });
            if (result.canceled) return;

            setBackupLoading(true);
            const file = result.assets[0];
            const content = await FileSystem.readAsStringAsync(file.uri);

            const { success, errors } = await db.importProductsFromCSV(content);
            Alert.alert(
                'Importação Concluída',
                `Sucesso: ${success}\nErros: ${errors}\n\nVerifique se o CSV usa os cabeçalhos: nome, preco, custo, categoria.`
            );
        } catch (e) {
            Alert.alert('Erro', 'Falha na importação: ' + e);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleShowCsvTutorial = () => {
        Alert.alert(
            "Como funciona a Importação?",
            "Crie uma planilha no Excel (ou Google Sheets) e salve como CSV.\n\n" +
            "• Para CLIENTES, a primeira linha deve ter:\n" +
            "nome, telefone, endereco, bairro\n\n" +
            "• Para PRODUTOS, a primeira linha deve ter:\n" +
            "nome, preco, custo, categoria, unidade\n\n" +
            "Dica: O app ignora acentos nos cabeçalhos (ex: 'endereço' ou 'endereco' funcionam)."
        );
    };

    const handleResetPassword = () => {
        console.log("Navigating to update-password");
        router.push('/auth/update-password');
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F2027', '#203A43', '#2C5364']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Opções</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        {editingName ? (
                            <View style={styles.editNameRow}>
                                <TextInput
                                    style={styles.nameInput}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Seu Nome"
                                    autoFocus
                                />
                                <TouchableOpacity onPress={handleUpdateProfile} disabled={loading}>
                                    {loading ? <ActivityIndicator size="small" color="#203A43" /> : <Feather name="check" size={24} color="#16A34A" />}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.nameRow}>
                                <Text style={styles.userName}>{user?.user_metadata?.full_name || 'Usuário'}</Text>
                                <TouchableOpacity onPress={() => setEditingName(true)}>
                                    <Feather name="edit-2" size={16} color="#6B7280" style={{ marginLeft: 8 }} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <Text style={styles.userEmail}>{user?.email}</Text>
                    </View>
                </View>

                {/* Sections */}

                <Text style={styles.sectionTitle}>CONTA</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={handleResetPassword}>
                        <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                            <Feather name="lock" size={20} color="#0284C7" />
                        </View>
                        <Text style={styles.rowText}>Alterar Senha</Text>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>PREFERÊNCIAS</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={toggleNotifications}>
                        <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                            <Feather name="bell" size={20} color="#9333EA" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowText}>Notificações</Text>
                            <Text style={styles.rowSubText}>Alertas de cobrança e novidades</Text>
                        </View>
                        <Feather name={notificationsEnabled ? "toggle-right" : "toggle-left"} size={24} color={notificationsEnabled ? "#203A43" : "#D1D5DB"} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>DADOS</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={handleExportBackup} disabled={backupLoading}>
                        <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                            <Feather name="download" size={20} color="#16A34A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowText}>Fazer Backup</Text>
                            <Text style={styles.rowSubText}>Salvar cópia de segurança (JSON)</Text>
                        </View>
                        {backupLoading ? <ActivityIndicator size="small" /> : <Feather name="chevron-right" size={20} color="#9CA3AF" />}
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.row} onPress={handleImportBackup} disabled={backupLoading}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEF9C3' }]}>
                            <Feather name="upload" size={20} color="#CA8A04" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowText}>Restaurar Dados</Text>
                            <Text style={styles.rowSubText}>Recuperar vendas e clientes</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>IMPORTAÇÃO DE DADOS</Text>
                    <TouchableOpacity onPress={handleShowCsvTutorial}>
                        <Text style={styles.linkText}>Como funciona?</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={handleImportClientsCSV} disabled={backupLoading}>
                        <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                            <Feather name="users" size={20} color="#4F46E5" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowText}>Importar Clientes</Text>
                            <Text style={styles.rowSubText}>CSV: nome, telefone, endereco...</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.row} onPress={handleImportProductsCSV} disabled={backupLoading}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFEDD5' }]}>
                            <Feather name="package" size={20} color="#EA580C" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowText}>Importar Produtos</Text>
                            <Text style={styles.rowSubText}>CSV: nome, preco, custo...</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>SUPORTE</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={() => Alert.alert("Suporte", "Envie um email para construwebb@gmail.com")}>
                        <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                            <Feather name="help-circle" size={20} color="#2563EB" />
                        </View>
                        <Text style={styles.rowText}>Ajuda e Suporte</Text>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.row} onPress={() => Alert.alert("Sobre", "Gestor de Vendas Simplificado v1.0\nDesenvolvido com carinho.")}>
                        <View style={[styles.iconBox, { backgroundColor: '#FCE7F3' }]}>
                            <Feather name="info" size={20} color="#DB2777" />
                        </View>
                        <Text style={styles.rowText}>Sobre o App</Text>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>SISTEMA</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={handleLogout}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                            <Feather name="log-out" size={20} color="#DC2626" />
                        </View>
                        <Text style={[styles.rowText, { color: '#DC2626' }]}>Sair da Conta</Text>
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                            <Feather name="trash-2" size={20} color="#991B1B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowText, { color: '#991B1B', fontWeight: 'bold' }]}>Apagar Minha Conta</Text>
                            <Text style={styles.rowSubText}>Ação irreversível</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.version}>Versão 1.0.0</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 60 : 20,
        paddingBottom: 30,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        // backgroundColor handled by gradient
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    content: {
        padding: 20,
    },
    profileCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#203A43',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#203A43',
        paddingBottom: 4,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    nameInput: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        padding: 0,
    },
    userEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#6B7280',
        marginBottom: 8,
        marginLeft: 4,
        marginTop: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginRight: 4,
        marginBottom: 8,
        marginTop: 10,
    },
    linkText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0284C7', // Blue link color
    },
    section: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 60,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    rowText: {
        fontSize: 16,
        color: '#374151',
        flex: 1,
    },
    rowSubText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    version: {
        color: '#9CA3AF',
        fontSize: 12,
    },
});
