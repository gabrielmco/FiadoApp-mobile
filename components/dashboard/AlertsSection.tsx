import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Bell, AlertTriangle, Calendar } from 'lucide-react-native';
import { Product, Client } from '../../types';
import { Colors } from '../../constants/colors';

interface AlertsSectionProps {
    alerts: {
        stockAlerts: Product[];
        debtAlerts: Client[];
    };
}

export function AlertsSection({ alerts }: AlertsSectionProps) {
    if (alerts.stockAlerts.length === 0 && alerts.debtAlerts.length === 0) {
        return null;
    }

    return (
        <View style={styles.alertsContainer}>
            <View style={styles.headerRow}>
                <Bell size={20} color={Colors.danger} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Alertas Inteligentes</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
                {/* Stock Alerts */}
                {alerts.stockAlerts.map(p => (
                    <View key={p.id} style={styles.alertCard}>
                        <View style={[styles.alertIcon, { backgroundColor: Colors.dangerLight }]}>
                            <AlertTriangle size={20} color={Colors.danger} />
                        </View>
                        <View>
                            <Text style={styles.alertTitle}>Estoque Baixo</Text>
                            <Text style={styles.alertDesc}>{p.name} ({p.stock} un)</Text>
                        </View>
                    </View>
                ))}

                {/* Debt Alerts */}
                {alerts.debtAlerts.map(c => (
                    <View key={c.id} style={styles.alertCard}>
                        <View style={[styles.alertIcon, { backgroundColor: Colors.warningLight }]}>
                            <Calendar size={20} color={Colors.warning} /> // Using warning color based on logic, previously hardcoded orange
                        </View>
                        <View>
                            <Text style={styles.alertTitle}>Cobrança Hoje</Text>
                            <Text style={styles.alertDesc}>{c.name}</Text>
                            <Text style={styles.debtValue}>R$ {c.totalDebt.toFixed(2)}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    alertsContainer: {
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    alertCard: {
        backgroundColor: Colors.white,
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    alertIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    alertDesc: {
        fontSize: 12,
        color: Colors.text.secondary,
    },
    debtValue: {
        fontSize: 10,
        color: Colors.warning, // Using warning color as per original logic/design intent (usually orange/gold)
        fontWeight: 'bold'
    }
});
