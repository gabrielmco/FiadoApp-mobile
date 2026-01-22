import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function DebugScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Debug Screen</Text>
            <Text style={styles.subtitle}>If you can see this, the app shell is working!</Text>

            <TouchableOpacity style={styles.btn} onPress={() => router.push('/(tabs)/sales')}>
                <Text style={styles.btnText}>Go to Sales (Tabs)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={() => router.push('/clients')}>
                <Text style={styles.btnText}>Go to Clients List</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    subtitle: { fontSize: 16, color: 'green', marginBottom: 30 },
    btn: { backgroundColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 10 },
    btnText: { fontSize: 16, fontWeight: '600' }
});
