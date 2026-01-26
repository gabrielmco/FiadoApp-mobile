import '../global.css';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { AnimatedSplash } from '../components/ui/AnimatedSplash';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isSplashFinished, setIsSplashFinished] = React.useState(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const segmentOne = (segments as string[])[1];
    const isPasswordResetFlow = segments.length > 1 && (segmentOne === 'update-password' || segmentOne === 'forgot-password');

    if (!session && !inAuthGroup) {
      // Usuario nao logado tentando acessar area protegida
      router.replace('/auth/login');
    } else if (session && inAuthGroup && !isPasswordResetFlow) {
      // Usuario logado tentando acessar login/signup (mas permitindo fluxo de senha)
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#203A43' }}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={{ color: 'white', marginTop: 20 }}>Carregando...</Text>
      </View>
    );
  }


  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={{ flex: 1 }}>
        {!isSplashFinished && (
          <AnimatedSplash onFinish={() => setIsSplashFinished(true)} />
        )}
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="sales/new" options={{ headerShown: false }} />
          <Stack.Screen name="clients/new" options={{ headerShown: false }} />
          <Stack.Screen name="products/new" options={{ headerShown: false }} />
          <Stack.Screen name="clients/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}