import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, Package, BarChart3, Bike } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';

export function QuickActions() {
    const router = useRouter();

    return (
        <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButtonContainer} onPress={() => router.push('/clients')}>
                <LinearGradient
                    colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
                    style={styles.actionButtonGradient}
                >
                    <Users size={24} color={Colors.white} />
                    <Text style={styles.actionTextWhite}>Clientes</Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonContainer} onPress={() => router.push('/products')}>
                <LinearGradient
                    colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
                    style={styles.actionButtonGradient}
                >
                    <Package size={24} color={Colors.white} />
                    <Text style={styles.actionTextWhite}>Produtos</Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonContainer} onPress={() => router.push('/analysis')}>
                <LinearGradient
                    colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
                    style={styles.actionButtonGradient}
                >
                    <BarChart3 size={24} color={Colors.white} />
                    <Text style={styles.actionTextWhite}>Análise</Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonContainer} onPress={() => router.push('/orders')}>
                <LinearGradient
                    colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
                    style={styles.actionButtonGradient}
                >
                    <Bike size={24} color={Colors.white} />
                    <Text style={styles.actionTextWhite}>Entregas</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    quickActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
    },
    actionButtonContainer: {
        width: '48%', // Approx 2 columns
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 6, // Increased elevation
        shadowColor: '#12252C', // Using primaryDark equivalent for better shadow
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
    actionButtonGradient: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionTextWhite: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
