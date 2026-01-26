import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { translateAuthError } from '../../utils/authErrors';

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
            return;
        }

        setLoading(true);
        const { error } = await signIn(email.trim(), password);
        setLoading(false);

        if (error) {
            Alert.alert('Erro no Acesso', translateAuthError(error));
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/logo.jpeg')}
                            style={{ width: '100%', height: '100%', borderRadius: 20 }}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={styles.appName}>Gestor de Vendas</Text>
                    <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Feather name="mail" size={20} color="#A7B1BC" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="exemplo@email.com"
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
                                placeholder="Sua senha secreta"
                                placeholderTextColor="#64748B"
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#A7B1BC" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.forgotPassBtn}
                        onPress={() => router.push('/auth/forgot-password')}
                    >
                        <Text style={styles.forgotPassText}>Esqueci minha senha</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginBtn}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#203A43" />
                        ) : (
                            <Text style={styles.loginBtnText}>ACESSAR CONTA</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.registerContainer}
                        onPress={() => router.push('/auth/signup')}
                    >
                        <Text style={styles.registerText}>
                            Não tem uma conta? <Text style={styles.registerLink}>Cadastre-se</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#203A43',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 120, // Aumentei um pouco
        height: 120,
        borderRadius: 24,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: '#FFF', // Fundo branco para garantir contraste do JPEG
        padding: 4, // Pequena borda branca
        overflow: 'hidden'
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    welcomeText: {
        fontSize: 16,
        color: '#A7B1BC',
        marginTop: 8,
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
        borderColor: 'transparent', // Can be used for focus state
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
    forgotPassBtn: {
        alignSelf: 'flex-end',
        marginBottom: 8,
    },
    forgotPassText: {
        color: '#5EEAD4',
        fontWeight: '600',
        fontSize: 14,
    },
    loginBtn: {
        backgroundColor: '#5EEAD4', // Teal-300: High contrast on dark bg
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
    loginBtnText: {
        color: '#134E4A', // Dark Teal text
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    registerContainer: {
        marginTop: 32,
        alignItems: 'center',
    },
    registerText: {
        color: '#A7B1BC',
        fontSize: 15,
    },
    registerLink: {
        color: '#5EEAD4',
        fontWeight: 'bold',
    },
});
