import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Edit2 } from 'lucide-react-native';
import { Client } from '../../types';
import { Colors } from '../../constants/colors';

interface ClientItemProps {
    item: Client;
    onPress: (id: string) => void;
    onEdit: (id: string, e: any) => void;
}

const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const ClientItem = ({ item, onPress, onEdit }: ClientItemProps) => {
    let status = 'Em dia';
    let statusStyle = styles.badgeGreen;
    let statusTextOpen = styles.textGreen;

    if (item.oldestDebtDays && item.oldestDebtDays > 30) {
        status = `Atrasado ${item.oldestDebtDays} dias`;
        statusStyle = styles.badgeRed;
        statusTextOpen = styles.textRed;
    } else if (item.totalDebt > 0) {
        status = `Pendente ${item.oldestDebtDays || 1} dias`;
        statusStyle = styles.badgeOrange;
        statusTextOpen = styles.textOrange;
    }

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <View style={styles.badgesRow}>
                        <View style={[styles.badge, statusStyle]}>
                            <Text style={[styles.badgeText, statusTextOpen]}>{status}</Text>
                        </View>
                        {item.credit > 0 && (
                            <View style={[styles.badge, styles.badgeBlue]}>
                                <Text style={[styles.badgeText, styles.textBlue]}>
                                    Crédito: {formatCurrency(item.credit)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <ChevronRight size={20} color={Colors.text.muted} />
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.debtContainer}>
                    <Text style={styles.debtLabel}>Deve</Text>
                    <Text style={[styles.debtValue, item.totalDebt > 0 ? styles.textRed : styles.textGreen]}>
                        {formatCurrency(item.totalDebt)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={(e) => onEdit(item.id, e)}
                >
                    <Edit2 size={18} color={Colors.text.muted} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    clientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 6,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    debtContainer: {
        flex: 1,
    },
    debtLabel: {
        fontSize: 12,
        color: Colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    debtValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    editBtn: {
        padding: 8,
        backgroundColor: Colors.background,
        borderRadius: 8,
    },
    // Colors helper styles
    badgeGreen: { backgroundColor: Colors.secondaryLight },
    textGreen: { color: Colors.secondary },
    badgeOrange: { backgroundColor: Colors.warningLight },
    textOrange: { color: Colors.warning },
    badgeRed: { backgroundColor: Colors.dangerLight },
    textRed: { color: Colors.danger },
    badgeBlue: { backgroundColor: '#E0F2FE' }, // Light blue not in constants yet, reusing or hardcoding
    textBlue: { color: '#0284C7' },
});
