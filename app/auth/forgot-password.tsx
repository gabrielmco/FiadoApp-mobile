import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { sendLoginCode, verifyOtp, updateProfile } = useAuth();

    // Steps: 0 = Email, 1 = OTP, 2 = New Password
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // Timer effect
    React.useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleSendCode = async () => {
        if (!email.trim()) {
            Alert.alert('Atenção', 'Digite seu email.');
            return;
        }

        setLoading(true);
        // We use signInWithOtp to send a code.
        const { error } = await sendLoginCode(email.trim());
        setLoading(false);

        if (error) {
            Alert.alert('Erro', error.message || 'Falha ao enviar código.');
        } else {
            Alert.alert('Código Enviado', 'Verifique seu email e digite o código recebido.');
            setStep(1);
            setResendTimer(60); // Start 60s cooldown
        }
    };

    const handleVerifyCode = async () => {
        if (!otp.trim() || otp.length < 6) {
            Alert.alert('Atenção', 'Digite o código recebido.');
            return;
        }

        setLoading(true);
        // 'magiclink' type is often used for email OTP in some Supabase versions/configs,
        // but 'email' is safer context-wise. Supabase JS usually infers from signInWithOtp.
        // Actually verifyOtp with type 'email' or 'magiclink' works for OTPs.
        // Let's try type 'email' first as it is standard for OTP verification.
        const { error } = await verifyOtp(email.trim(), otp.trim(), 'email');
        setLoading(false);

        if (error) {
            // Also try 'magiclink' type if 'email' fails, sometimes strictly required for link-based OTPs
            if (error.message.includes('magiclink') || error.message.includes('token')) {
                const { error: error2 } = await verifyOtp(email.trim(), otp.trim(), 'magiclink' as any);
                if (!error2) {
                    setStep(2);
                    return;
                }
            }
            Alert.alert('Erro', 'Código inválido ou expirado.');
        } else {
            setStep(2);
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Erro', 'Preencha todos os campos.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(false);

        if (error) {
            Alert.alert('Erro', error.message);
        } else {
            Alert.alert('Sucesso', 'Senha atualizada com sucesso!', [
                { text: 'OK', onPress: () => router.dismissAll() } // Go back to App root (likely Dashboard since logged in)
            ]);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <TouchableOpacity onPress={() => step === 0 ? router.back() : setStep(step - 1)} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Feather name={step === 2 ? "lock" : step === 1 ? "shield" : "key"} size={40} color="#FFF" />
                    </View>
                    <Text style={styles.title}>
                        {step === 0 && 'Recuperar Senha'}
                        {step === 1 && 'Código de Verificação'}
                        {step === 2 && 'Nova Senha'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 0 && 'Digite seu email para receber o código.'}
                        {step === 1 && `Enviamos um código para ${email}`}
                        {step === 2 && 'Crie sua nova senha de acesso.'}
                    </Text>
                </View>

                {/* STEP 0: EMAIL */}
                {step === 0 && (
                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Cadastrado</Text>
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
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleSendCode}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>ENVIAR CÓDIGO</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* STEP 1: OTP */}
                {step === 1 && (
                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Código de Verificação</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="shield" size={20} color="#A7B1BC" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholder="Digite o código"
                                    placeholderTextColor="#64748B"
                                    keyboardType="number-pad"
                                    maxLength={8} // Raised to 8 as per user report
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleVerifyCode}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>VERIFICAR CÓDIGO</Text>}
                        </TouchableOpacity>

                        <View style={styles.resendContainer}>
                            {resendTimer > 0 ? (
                                <Text style={styles.resendText}>Reenviar código em {resendTimer}s</Text>
                            ) : (
                                <TouchableOpacity onPress={handleSendCode}>
                                    <Text style={styles.resendLink}>Reenviar Código</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* STEP 2: NEW PASSWORD */}
                {step === 2 && (
                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nova Senha</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="lock" size={20} color="#A7B1BC" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Mínimo 6 caracteres"
                                    placeholderTextColor="#64748B"
                                    secureTextEntry
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmar Senha</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="lock" size={20} color="#A7B1BC" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Repita a senha"
                                    placeholderTextColor="#64748B"
                                    secureTextEntry
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleUpdatePassword}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>ATUALIZAR SENHA</Text>}
                        </TouchableOpacity>
                    </View>
                )}

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
        marginBottom: 40,
    },
    iconContainer: {
        width: 70,
        height: 70,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
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
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 24,
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
    actionBtn: {
        backgroundColor: '#F59E0B',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    btnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    resendContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    resendText: {
        color: '#A7B1BC',
        fontSize: 14,
    },
    resendLink: {
        color: '#F59E0B',
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});
