import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function UpdatePasswordScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Visibility States
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const handleUpdate = async () => {
        if (!currentPassword || !password || !confirmPassword) {
            Alert.alert('Erro', 'Preencha todos os campos.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);

        // Security Check: Verify current password first
        if (user?.email) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (signInError) {
                setLoading(false);
                Alert.alert('Erro de Segurança', 'A senha atual está incorreta.');
                return;
            }
        }

        // Proceed to update
        const { error } = await supabase.auth.updateUser({ password: password });
        setLoading(false);

        if (error) {
            Alert.alert('Erro', error.message);
        } else {
            Alert.alert('Sucesso', 'Sua senha foi atualizada!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Feather name="lock" size={40} color="#FFF" style={{ marginBottom: 16 }} />
                    <Text style={styles.title}>Alterar Senha</Text>
                    <Text style={styles.subtitle}>Confirme sua senha atual para continuar.</Text>
                </View>

                {/* Current Password */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Senha Atual</Text>
                    <View style={styles.inputWrapper}>
                        <Feather name="shield" size={20} color="#A7B1BC" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Digite sua senha atual"
                            placeholderTextColor="#64748B"
                            secureTextEntry={!showCurrentPass}
                        />
                        <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)}>
                            <Feather name={showCurrentPass ? "eye" : "eye-off"} size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.forgotLink}
                        onPress={() => router.push('/auth/forgot-password')}
                    >
                        <Text style={styles.forgotText}>Esqueceu a senha atual?</Text>
                    </TouchableOpacity>
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nova Senha</Text>
                    <View style={styles.inputWrapper}>
                        <Feather name="lock" size={20} color="#A7B1BC" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Mínimo 6 caracteres"
                            placeholderTextColor="#64748B"
                            secureTextEntry={!showNewPass}
                        />
                        <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                            <Feather name={showNewPass ? "eye" : "eye-off"} size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmar Nova Senha</Text>
                    <View style={styles.inputWrapper}>
                        <Feather name="lock" size={20} color="#A7B1BC" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Repita a nova senha"
                            placeholderTextColor="#64748B"
                            secureTextEntry={!showConfirmPass}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
                            <Feather name={showConfirmPass ? "eye" : "eye-off"} size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.updateBtn}
                    onPress={handleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.btnText}>ATUALIZAR SENHA</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#203A43',
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#A7B1BC',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#E2E8F0',
        marginBottom: 8,
        fontWeight: '600',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        height: 56,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        height: '100%',
    },
    updateBtn: {
        backgroundColor: '#F59E0B',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    btnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    forgotLink: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    forgotText: {
        color: '#F59E0B',
        fontSize: 14,
        fontWeight: '500',
    },
});
