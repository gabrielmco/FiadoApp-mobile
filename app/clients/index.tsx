import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { Search, Plus, Filter, X } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Client } from '../../types';
import { db } from '../../services/db';
import { Colors } from '../../constants/colors';
import { ClientItem } from '../../components/clients/ClientItem';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

export default function ClientsScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterBy, setFilterBy] = useState<'ALL' | 'DEBT' | 'CREDIT'>('ALL');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await db.getClients();
            // Sort: Debts first (desc), then name
            const sorted = data.sort((a, b) => {
                if (b.totalDebt !== a.totalDebt) return b.totalDebt - a.totalDebt;
                return a.name.localeCompare(b.name);
            });
            setClients(sorted);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.phone && c.phone.includes(searchQuery));

            if (!matchesSearch) return false;

            if (filterBy === 'DEBT') return c.totalDebt > 0;
            if (filterBy === 'CREDIT') return c.credit > 0;

            return true;
        });
    }, [clients, searchQuery, filterBy]);

    const getFilterLabel = (tab: string) => {
        switch (tab) {
            case 'ALL': return 'Todos';
            case 'DEBT': return 'Inadimplentes';
            case 'CREDIT': return 'Com Crédito';
            default: return 'Filtros';
        }
    };

    const handleEditClient = (id: string, e: any) => {
        e?.stopPropagation();
        router.push({ pathname: '/clients/new', params: { id } });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <ScreenHeader
                title="Meus Clientes"
                showBackButton={false}
                rightAction={
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => router.push('/clients/new')}
                    >
                        <Plus size={24} color={Colors.white} />
                    </TouchableOpacity>
                }
            />

            {/* Search & Filter */}
            <View style={styles.filterSection}>
                <View style={styles.searchBox}>
                    <Search size={20} color={Colors.text.muted} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar cliente..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={Colors.text.muted}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color={Colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Tabs */}
                <View style={styles.tabs}>
                    {(['ALL', 'DEBT', 'CREDIT'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabItem, filterBy === tab && styles.tabItemActive]}
                            onPress={() => setFilterBy(tab)}
                        >
                            <Text style={[styles.tabText, filterBy === tab && styles.tabTextActive]}>
                                {getFilterLabel(tab)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredClients}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ClientItem
                            item={item}
                            onPress={(id) => router.push({ pathname: '/clients/[id]', params: { id } })}
                            onEdit={handleEditClient}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Filter size={48} color={Colors.text.muted} />
                            <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'android' ? 40 : 0
    },
    header: {
        // Removed
    },
    title: {
        // Removed
    },
    addButton: {
        backgroundColor: Colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // Reduced styles
    },
    filterSection: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.text.primary,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        padding: 4,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
    },
    tabItemActive: {
        backgroundColor: Colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    tabTextActive: {
        color: Colors.text.primary,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: Colors.text.muted,
        fontWeight: '500',
    },
});
