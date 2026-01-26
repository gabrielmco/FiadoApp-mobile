import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, CheckCircle, FileText } from 'lucide-react-native';
import { Sale, PaymentRecord } from '../../types';
import { ReceiptService } from '../../services/receipt';
import { Colors } from '../../constants/colors';

interface TransactionItemProps {
    item: Sale | PaymentRecord;
    onEdit: (sale: Sale) => void;
    clientName: string;
}

export const TransactionItem = memo(({ item, onEdit, clientName }: TransactionItemProps) => {
    // Narrowing type
    const isPayment = 'amount' in item && !('items' in item);

    // Se for um PAGAMENTO
    if (isPayment) {
        const payment = item as PaymentRecord;
        return (
            <View style={styles.paymentItem}>
                <View style={styles.saleHeader}>
                    <View style={styles.saleDateContainer}>
                        <Calendar size={14} color={Colors.secondary} />
                        <Text style={[styles.saleDate, { color: Colors.secondary }]}>
                            {new Date(payment.timestamp).toLocaleDateString('pt-BR')}
                        </Text>
                        <Text style={[styles.saleTime, { color: Colors.secondary }]}>
                            {new Date(payment.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text style={styles.paymentValue}>+ R$ {payment.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.paymentBadge}>
                    <TouchableOpacity onPress={() => ReceiptService.sharePaymentReceipt({ ...payment, clientName: clientName || 'Cliente' })}>
                        <FileText size={24} color={Colors.primary} style={{ marginRight: 8 }} />
                    </TouchableOpacity>
                    <CheckCircle size={12} color={Colors.secondary} />
                    <Text style={styles.paymentBadgeText}>PAGAMENTO RECEBIDO</Text>
                </View>
            </View>
        );
    }

    // Se for uma VENDA
    const sale = item as Sale;
    const progress = sale.finalTotal > 0
        ? ((sale.finalTotal - sale.remainingBalance) / sale.finalTotal) * 100
        : 100;

    return (
        <TouchableOpacity
            style={styles.saleItem}
            onPress={() => onEdit(sale)}
            activeOpacity={0.7}
        >
            <View style={styles.saleHeader}>
                <View style={styles.saleDateContainer}>
                    <Calendar size={14} color={Colors.text.muted} />
                    <Text style={styles.saleDate}>
                        {new Date(sale.timestamp).toLocaleDateString('pt-BR')}
                    </Text>
                    <Text style={styles.saleTime}>
                        {new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <Text style={styles.saleTotalValue}>R$ {sale.finalTotal.toFixed(2)}</Text>
            </View>

            <Text style={styles.saleItemsText} numberOfLines={2}>
                {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
            </Text>

            {sale.remainingBalance > 0 ? (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={styles.paidLabel}>Pago: R$ {(sale.finalTotal - sale.remainingBalance).toFixed(2)}</Text>
                        <Text style={styles.remainingLabel}>Resta: R$ {sale.remainingBalance.toFixed(2)}</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>QUITADO</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    saleItem: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    paymentItem: {
        backgroundColor: Colors.secondaryLight,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.secondary,
    },
    saleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    saleDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    saleDate: {
        fontSize: 14,
        color: Colors.text.muted,
        fontWeight: '500',
    },
    saleTime: {
        fontSize: 12,
        color: Colors.text.muted,
    },
    saleTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    paymentValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    saleItemsText: {
        fontSize: 14,
        color: Colors.text.secondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    progressContainer: {
        marginTop: 8,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: Colors.background,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.secondary,
        borderRadius: 4,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    paidLabel: {
        fontSize: 12,
        color: Colors.secondary,
        fontWeight: '600',
    },
    remainingLabel: {
        fontSize: 12,
        color: Colors.danger,
        fontWeight: '600',
    },
    paidBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: Colors.secondaryLight,
        borderRadius: 12,
    },
    paidBadgeText: {
        fontSize: 12,
        color: Colors.secondary,
        fontWeight: 'bold',
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    paymentBadgeText: {
        fontSize: 12,
        color: Colors.secondary,
        fontWeight: 'bold',
    },
});
