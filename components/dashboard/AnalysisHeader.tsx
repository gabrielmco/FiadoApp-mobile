import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Database } from 'lucide-react-native';

interface AnalysisHeaderProps {
    dateRangeLabel: string;
    onDateFilterPress: () => void;
    activeTab: 'GENERAL' | 'PRODUCTS' | 'COSTS';
    setActiveTab: (tab: 'GENERAL' | 'PRODUCTS' | 'COSTS') => void;
    onBackupPress: () => void;
}

export const AnalysisHeader = ({
    dateRangeLabel,
    onDateFilterPress,
    activeTab,
    setActiveTab,
    onBackupPress
}: AnalysisHeaderProps) => {
    return (
        <LinearGradient
            colors={['#0F2027', '#203A43', '#2C5364']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
            <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>Análise Completa</Text>
                <TouchableOpacity
                    style={styles.monthSelector}
                    onPress={onDateFilterPress}
                >
                    <Calendar size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.monthText}>
                        {dateRangeLabel}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tabs Segmented Control - Modified to include Backup Button */}
            <View style={styles.tabsRow}>
                <View style={[styles.segmentedControl, { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    {(['GENERAL', 'PRODUCTS', 'COSTS'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.segmentBtn, activeTab === tab && styles.segmentBtnActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive, activeTab !== tab && { color: '#E5E7EB' }]}>
                                {tab === 'GENERAL' ? 'Visão Geral' : tab === 'PRODUCTS' ? 'Produtos' : 'Despesas'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {/* Backup Button next to tabs */}
                <TouchableOpacity style={styles.backupBtnSmall} onPress={onBackupPress}>
                    <Database size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 60, // Fixed for simplicity, can use Platform select if passed as prop or handled
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    monthText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    tabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    segmentedControl: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    segmentBtnActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    segmentText: {
        fontSize: 12,
        fontWeight: '600',
    },
    segmentTextActive: {
        color: '#1F2937',
    },
    backupBtnSmall: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
});
