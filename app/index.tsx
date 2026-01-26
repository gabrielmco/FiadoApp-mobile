import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#203A43' }}>
                <ActivityIndicator size="large" color="#FFF" />
            </View>
        );
    }

    if (session) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/auth/login" />;
}
