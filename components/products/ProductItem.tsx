import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Package, Edit2 } from 'lucide-react-native';
import { Product } from '../../types';
import { Colors } from '../../constants/colors';

interface ProductItemProps {
    item: Product;
    onPress: (id: string) => void;
}

const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ProductItem = ({ item, onPress }: ProductItemProps) => {
    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => onPress(item.id)}
        >
            <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                    <Package size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <View style={styles.tagsContainer}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{item.department || 'Outros'}</Text>
                        </View>
                        {item.animalType && (
                            <View style={[styles.tag, styles.tagBlue]}>
                                <Text style={[styles.tagText, styles.textBlue]}>{item.animalType}</Text>
                            </View>
                        )}
                        <View style={[styles.tag, styles.tagGray]}>
                            <Text style={styles.tagText}>{item.unit}</Text>
                        </View>
                        {/* Estoque Badge */}
                        {item.trackStock && (
                            <View style={[
                                styles.tag,
                                (item.stock || 0) <= (item.minStock || 0) ? styles.badgeRed : styles.badgeGreen
                            ]}>
                                <Text style={[
                                    styles.tagText,
                                    (item.stock || 0) <= (item.minStock || 0) ? styles.textRed : styles.textGreen
                                ]}>
                                    Est: {item.stock || 0}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.cardPrice}>
                    <Text style={styles.priceText}>{formatCurrency(item.price)}</Text>
                    <Edit2 size={16} color={Colors.text.muted} style={{ marginTop: 4 }} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        backgroundColor: Colors.background,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 10,
        color: Colors.text.secondary,
        fontWeight: '500',
    },
    tagBlue: {
        backgroundColor: '#E0F2FE',
    },
    textBlue: {
        color: '#0284C7',
    },
    tagGray: {
        backgroundColor: Colors.background,
    },
    cardPrice: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingLeft: 8,
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    badgeRed: { backgroundColor: Colors.dangerLight },
    textRed: { color: Colors.danger },
    badgeGreen: { backgroundColor: Colors.secondaryLight },
    textGreen: { color: Colors.secondary },
});
