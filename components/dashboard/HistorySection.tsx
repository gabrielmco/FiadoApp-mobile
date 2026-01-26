import React from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, StyleSheet, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Pencil, Wallet, User, History } from 'lucide-react-native';
import { Sale, PaymentRecord } from '../../types';
import { Colors } from '../../constants/colors';

interface HistorySectionProps {
    historyTab: 'ALL' | 'CASH' | 'CREDIT';
    setHistoryTab: (tab: 'ALL' | 'CASH' | 'CREDIT') => void;
    filteredHistory: any[];
    loading: boolean;
    loadData: () => void;
    openPaymentModal: (payment: (PaymentRecord & { clientName: string })) => void;
    openEditModal: (sale: Sale) => void;
}

export function HistorySection({
    historyTab,
    setHistoryTab,
    filteredHistory,
    loading,
    loadData,
    openPaymentModal,
    openEditModal
}: HistorySectionProps) {

    // Enable LayoutAnimation on Android
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const handleTabChange = (tab: 'ALL' | 'CASH' | 'CREDIT') => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setHistoryTab(tab);
    };

    const renderItem = ({ item }: { item: any }) => {
        // PAGAMENTO (CLICÁVEL)
        if (!('items' in item)) {
            const payment = item as (PaymentRecord & { clientName: string });
            return (
                <TouchableOpacity onPress={() => openPaymentModal(payment)} activeOpacity={0.7}>
                    <View style={[styles.saleCard, styles.paymentCardBorder]}>
                        <View style={styles.saleCardLeft}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.secondaryLight }]}>
                                <Wallet size={20} color={Colors.secondary} />
                            </View>
                            <View>
                                <Text style={styles.saleClientName}>{payment.clientName}</Text>
                                <Text style={styles.saleInfo}>
                                    {new Date(payment.timestamp).toLocaleDateString('pt-BR')} • {new Date(payment.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Text style={[styles.saleItemsText, { color: Colors.secondary, fontWeight: '500' }]}>
                                    Recebimento de Dívida
                                </Text>
                            </View>
                        </View>
                        <View style={styles.saleCardRight}>
                            <Text style={[styles.saleTotal, { color: Colors.secondary }]}>+ R$ {payment.amount.toFixed(2).replace('.', ',')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                <Pencil size={14} color={Colors.secondary} />
                                <View style={[styles.statusBadge, styles.statusBadgeCash]}>
                                    <Text style={[styles.statusText, styles.statusTextCash]}>Recebido</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        // VENDA (Clicável)
        const sale = item as Sale;
        return (
            <TouchableOpacity onPress={() => openEditModal(sale)} activeOpacity={0.7}>
                <View style={styles.saleCard}>
                    <View style={styles.saleCardLeft}>
                        <View style={styles.avatarPlaceholder}>
                            <User size={20} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.saleClientName}>{sale.clientName}</Text>
                            <Text style={styles.saleInfo}>
                                {new Date(sale.timestamp).toLocaleDateString('pt-BR')} • {new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={styles.saleItemsText} numberOfLines={2}>
                                {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}: {sale.items.map(i => i.productName).join(', ')}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.saleCardRight}>
                        <Text style={styles.saleTotal}>R$ {sale.finalTotal.toFixed(2).replace('.', ',')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <Pencil size={14} color={Colors.text.muted} />
                            <View style={[styles.statusBadge, sale.type === 'CREDIT' ? styles.statusBadgeCredit : styles.statusBadgeCash]}>
                                <Text style={[styles.statusText, sale.type === 'CREDIT' ? styles.statusTextCredit : styles.statusTextCash]}>
                                    {sale.type === 'CREDIT' ? 'Pendente' : 'Pago'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.historySection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <History size={20} color={Colors.text.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Histórico Recente</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, historyTab === 'ALL' && styles.activeTab]}
                    onPress={() => handleTabChange('ALL')}
                >
                    <Text style={[styles.tabText, historyTab === 'ALL' && styles.activeTabText]}>Tudo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, historyTab === 'CASH' && styles.activeTab]}
                    onPress={() => handleTabChange('CASH')}
                >
                    <Text style={[styles.tabText, historyTab === 'CASH' && styles.activeTabText]}>À Vista / Receb.</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, historyTab === 'CREDIT' && styles.activeTab]}
                    onPress={() => handleTabChange('CREDIT')}
                >
                    <Text style={[styles.tabText, historyTab === 'CREDIT' && styles.activeTabText]}>A Prazo</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={filteredHistory}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: Colors.text.muted }}>Nenhuma venda ou pagamento recente.</Text>
                    </View>
                )}
                style={{ flex: 1 }}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={3}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    historySection: {
        flex: 1,
        marginTop: 12
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        color: Colors.text.secondary,
        fontWeight: '500',
        fontSize: 12
    },
    activeTabText: {
        color: Colors.white,
        fontWeight: 'bold'
    },
    saleCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    paymentCardBorder: {
        borderLeftWidth: 4,
        borderLeftColor: Colors.secondary
    },
    saleCardLeft: {
        flexDirection: 'row',
        gap: 12,
        flex: 1
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center'
    },
    saleClientName: {
        fontWeight: 'bold',
        color: Colors.text.primary,
        fontSize: 14,
        marginBottom: 2
    },
    saleInfo: {
        fontSize: 10,
        color: Colors.text.muted,
        marginBottom: 2
    },
    saleItemsText: {
        fontSize: 12,
        color: Colors.text.secondary,
        maxWidth: 180
    },
    saleCardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between'
    },
    saleTotal: {
        fontWeight: 'bold',
        fontSize: 16,
        color: Colors.text.primary,
        marginBottom: 4
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusBadgeCash: {
        backgroundColor: Colors.secondaryLight
    },
    statusBadgeCredit: {
        backgroundColor: Colors.warningLight
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold'
    },
    statusTextCash: {
        color: Colors.secondary
    },
    statusTextCredit: {
        color: Colors.warning
    }
});
