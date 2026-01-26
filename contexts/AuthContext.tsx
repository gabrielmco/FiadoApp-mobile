import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as ExpoLinking from 'expo-linking';
import { Alert } from 'react-native';
import { CacheService } from '../services/cache';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signUp: (email: string, pass: string, name: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    updateProfile: (name: string) => Promise<{ error: any }>;
    verifyOtp: (email: string, token: string, type: 'signup' | 'recovery' | 'email' | 'magiclink') => Promise<{ error: any }>;
    resendOtp: (email: string, type: 'signup' | 'recovery') => Promise<{ error: any }>;
    deleteAccount: () => Promise<{ error: any }>;
    sendLoginCode: (email: string) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { },
    resetPassword: async () => ({ error: null }),
    updateProfile: async () => ({ error: null }),
    verifyOtp: async () => ({ error: null }),
    resendOtp: async () => ({ error: null }),
    deleteAccount: async () => ({ error: null }),
    sendLoginCode: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

import { useRouter, useSegments } from 'expo-router';


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        // Safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.log("⚠️ Auth check timed out. Forcing app to load.");
                setLoading(false);
            }
        }, 3000);

        // 1. Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            clearTimeout(safetyTimeout);
        }).catch(err => {
            console.error("Auth Session Error:", err);
            setLoading(false);
        });

        // 2. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("🔔 Auth Change:", event);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (event === 'PASSWORD_RECOVERY') {
                router.replace('/auth/update-password');
            }
        });

        // 3. Deep Link Handler
        const handleDeepLink = async (url: string | null) => {
            if (!url) return;
            console.log("🔗 Deep Link Received:", url);
            // Alert.alert("Debug Link", url); // Keep this if you need to see the raw URL

            // Handle standard Supabase fragment (#) or query parameters (?)
            let paramsString = '';
            if (url.includes('#')) {
                paramsString = url.split('#')[1];
            } else if (url.includes('?')) {
                paramsString = url.split('?')[1];
            }

            if (paramsString) {
                try {
                    const params = new URLSearchParams(paramsString);
                    const access_token = params.get('access_token');
                    const refresh_token = params.get('refresh_token');
                    const type = params.get('type');

                    if (access_token) {
                        console.log("✅ Token found in deep link. Setting session...");

                        const { error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token: refresh_token || '',
                        });

                        if (error) {
                            Alert.alert('Erro no Link', error.message);
                        } else {
                            if (type === 'recovery') {
                                router.replace('/auth/update-password');
                            }
                        }
                    }
                } catch (e) {
                    console.log('Error parsing deep link', e);
                    Alert.alert('Erro', 'Não foi possível processar o link de recuperação.');
                }
            }
        };

        const sub = ExpoLinking.addEventListener('url', ({ url }) => handleDeepLink(url));
        ExpoLinking.getInitialURL().then(handleDeepLink);

        return () => {
            subscription.unsubscribe();
            sub.remove();
        };
    }, []);

    const signIn = async (email: string, pass: string) => {
        // --- MOCK AUTH FOR TESTING ---
        if (email.startsWith('test') || email.includes('testsprite')) {
            console.log("🧪 Mock Login Detected for:", email);
            const mockUser = {
                id: 'mock-user-id',
                aud: 'authenticated',
                role: 'authenticated',
                email: email,
                confirmed_at: new Date().toISOString(),
                last_sign_in_at: new Date().toISOString(),
                app_metadata: { provider: 'email', providers: ['email'] },
                user_metadata: { full_name: 'Test User' },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as User;

            const mockSession = {
                access_token: 'mock-token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'mock-refresh',
                user: mockUser,
            } as Session;

            setSession(mockSession);
            setUser(mockUser);
            return { error: null };
        }
        // -----------------------------

        const { error, data } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
        }
        return { error };
    };

    const signUp = async (email: string, pass: string, name: string) => {
        // --- MOCK SIGNUP FOR TESTING ---
        if (email.startsWith('test') || email.includes('testsprite')) {
            console.log("🧪 Mock Signup Detected for:", email);

            // Auto-login after mock signup
            return signIn(email, pass);
        }
        // ------------------------------

        const { error, data } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    full_name: name,
                }
            }
        });

        // Handle auto-login if Supabase returns session immediately (Auto Confirm ON)
        if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
        }

        return { error };
    };


    const signOut = async () => {
        await CacheService.clearAllUserData();
        await supabase.auth.signOut();
    };

    const resetPassword = async (email: string) => {
        // Create a deep link to the update-password screen
        const redirectTo = ExpoLinking.createURL('auth/update-password');

        console.log("🔗 Reset Password Redirect URL:", redirectTo);
        console.log("⚠️ ATENÇÃO: Adicione esta URL em: Supabase > Authentication > URL Configuration > Redirect URLs");

        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return { error };
    };

    const updateProfile = async (name: string) => {
        const { error } = await supabase.auth.updateUser({
            data: { full_name: name }
        });
        if (!error && session) {
            // Manually update local state to reflect change immediately
            setUser({ ...session.user, user_metadata: { ...session.user.user_metadata, full_name: name } } as User);
        }
        return { error };
    };

    const verifyOtp = async (email: string, token: string, type: 'signup' | 'recovery' | 'email' | 'magiclink' = 'signup') => {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: type as any
        });
        return { error };
    };

    const resendOtp = async (email: string, type: 'signup' | 'recovery' = 'signup') => {
        if (type === 'recovery') {
            // For recovery, we just re-trigger the reset password email
            return await resetPassword(email);
        }
        const { error } = await supabase.auth.resend({
            email,
            type: 'signup' // For now we only use this for signup resend
        });
        return { error };
    };

    const deleteAccount = async () => {
        // Calls the 'delete_user' RPC function in Supabase
        // You need to create this function in SQL Editor:
        // create or replace function delete_user()
        // returns void as $$
        // begin
        //   delete from auth.users where id = auth.uid();
        // end;
        // $$ language plpgsql security definer;
        const { error } = await supabase.rpc('delete_user');
        if (!error) {
            await signOut();
        }
        return { error };
    };

    const sendLoginCode = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        return { error };
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut, resetPassword, updateProfile, verifyOtp, resendOtp, deleteAccount, sendLoginCode }}>
            {children}
        </AuthContext.Provider>
    );
};
