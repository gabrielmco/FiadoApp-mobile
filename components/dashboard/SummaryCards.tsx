import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SummaryCardsProps {
    metrics: {
        revenue: number;
        profit: number;
        costs: number;
        receivables: number;
    };
}

const KPICard = ({ title, value, color, footer }: any) => (
    <View style={styles.card}>
        <Text style={styles.cardLabel}>{title}</Text>
        <Text style={[styles.cardValue, { color: color || '#1F2937' }]}>
            R$ {value.toFixed(2).replace('.', ',')}
        </Text>
        {footer && <Text style={styles.cardFooter}>{footer}</Text>}
    </View>
);

export const SummaryCards = ({ metrics }: SummaryCardsProps) => {
    return (
        <View style={styles.gridContainer}>
            <View style={styles.row}>
                <KPICard title="Faturamento Total" value={metrics.revenue} color="#2563EB" />
                <KPICard title="Lucro Líquido" value={metrics.profit} color="#203A43" footer="(Rec - Custos - Despesas)" />
            </View>
            <View style={styles.row}>
                <KPICard title="Custos Operacionais" value={metrics.costs} color="#EF4444" footer="Produtos + Despesas" />
                <KPICard title="A Receber (Fiado)" value={metrics.receivables} color="#F97316" />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    gridContainer: { gap: 12, marginBottom: 24 },
    row: { flexDirection: 'row', gap: 12 },
    card: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        justifyContent: 'center'
    },
    cardLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
    cardValue: { fontSize: 18, fontWeight: 'bold' },
    cardFooter: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
});
