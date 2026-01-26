import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { translateAuthError } from '../../utils/authErrors';

export default function SignupScreen() {
    const router = useRouter();
    const { signUp, signOut } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Senha Fraca', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }

        setLoading(true);
        const { error } = await signUp(email.trim(), password, name.trim());
        setLoading(false);

        if (error) {
            Alert.alert('Falha no Cadastro', translateAuthError(error));
        } else {
            // Force logout so user has to login manually
            await signOut();

            Alert.alert(
                'Conta Criada!',
                'Cadastro realizado com sucesso. Agora faça login para entrar.',
                [{ text: 'Ir para Login', onPress: () => router.replace('/auth/login') }]
            );
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Feather name="user-plus" size={48} color="#FFF" />
                        </View>
                        <Text style={styles.title}>Nova Conta</Text>
                        <Text style={styles.subtitle}>Junte-se ao gestor mais simples.</Text>
                    </View>

                    <View style={styles.formContainer}>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome Completo</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="user" size={20} color="#A7B1BC" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Seu nome"
                                    placeholderTextColor="#64748B"
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="mail" size={20} color="#A7B1BC" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="seu@email.com"
                                    placeholderTextColor="#64748B"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Senha</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="lock" size={20} color="#A7B1BC" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Crie uma senha"
                                    placeholderTextColor="#64748B"
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#A7B1BC" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmar Senha</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="check-circle" size={20} color="#A7B1BC" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Repita a senha"
                                    placeholderTextColor="#64748B"
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.signupBtn}
                            onPress={handleSignup}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.signupBtnText}>CRIAR MINHA CONTA</Text>
                            )}
                        </TouchableOpacity>

                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Ao criar conta, você concorda com nossos <Text style={styles.footerLink}>Termos</Text>.
                        </Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#203A43',
    },
    topPatternCircle: {
        display: 'none',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 60,
    },
    backBtn: {
        marginBottom: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#A7B1BC',
    },
    formContainer: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#E2E8F0',
        marginBottom: 8,
        fontWeight: '600',
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: 'transparent',
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
    signupBtn: {
        backgroundColor: '#5EEAD4',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: '#5EEAD4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    signupBtnText: {
        color: '#134E4A',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    footer: {
        marginTop: 'auto',
        alignItems: 'center',
        paddingTop: 32,
    },
    footerText: {
        color: '#64748B',
        fontSize: 13,
        textAlign: 'center',
    },
    footerLink: {
        color: '#5EEAD4',
        fontWeight: 'bold',
    },
});
