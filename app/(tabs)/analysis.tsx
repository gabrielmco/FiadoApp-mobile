import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    RefreshControl,
    TouchableOpacity,
    Platform,
    Dimensions,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    Share
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    BarChart2,
    PieChart as PieChartIcon,
    Activity,
    Trash2,
    Database,
    Upload,
    Download,
    Copy,
    X,
    Server,
    Save,
    FileJson,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Check
} from 'lucide-react-native';
import Svg, { Circle, Path, Line, Polyline } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker'; // Added import
import * as FileSystem from 'expo-file-system'; // Added import
import { useFocusEffect } from 'expo-router';
import { db } from '../../services/db';
import { Product, Sale, Client, Expense } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- Chart Components ---

// 1. Pie Chart Component
const SimplePieChart = ({ data }: { data: { value: number, color: string, label: string }[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let startAngle = 0;
    const radius = 70;
    const center = 100;

    if (total === 0) return <Text style={{ textAlign: 'center', color: '#9CA3AF' }}>Sem dados</Text>;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 220 }}>
            <Svg width={200} height={200}>
                {data.map((item, index) => {
                    const percentage = item.value / total;
                    const angle = percentage * 360;
                    const endAngle = startAngle + angle;

                    const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);

                    const largeArcFlag = angle > 180 ? 1 : 0;

                    const pathData = [
                        `M ${center} ${center}`,
                        `L ${x1} ${y1}`,
                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                        `Z`
                    ].join(' ');

                    const slice = (
                        <Path
                            key={index}
                            d={pathData}
                            fill={item.color}
                        />
                    );
                    startAngle += angle;
                    return slice;
                })}
            </Svg>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                {data.map((item, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 12, height: 12, backgroundColor: item.color, borderRadius: 6 }} />
                        <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: 'bold' }}>{item.label} ({((item.value / total) * 100).toFixed(0)}%)</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// 2. Line Chart (Clean & Elegant) - Fixed for Y-Axis Scale
const SimpleLineChart = ({ data }: { data: { label: string, value: number }[] }) => {
    if (data.length === 0) return <Text style={{ textAlign: 'center', color: '#9CA3AF' }}>Sem dados</Text>;

    const height = 200;
    const width = SCREEN_WIDTH - 60; // Padding consideration
    const padding = 20;

    if (data.length < 2) {
        return (
            <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#374151' }}>
                    {data.length === 1 ? `R$ ${data[0].value.toFixed(2)}` : 'Dados insuficientes'}
                </Text>
                {data.length === 1 && <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{data[0].label}</Text>}
                <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8 }}>Precisa de pelo menos 2 dias de vendas para gerar o gráfico.</Text>
            </View>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 10); // Minimum scale to avoid flatline at 0
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <Svg width={width} height={height}>
                {/* Axes */}
                <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="2" />
                <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="2" />

                {/* The Line */}
                <Polyline
                    points={points}
                    fill="none"
                    stroke="#203A43"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Dots */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
                    // Only show dots if less than 20 points to avoid clutter
                    if (data.length > 20 && i % Math.ceil(data.length / 20) !== 0) return null;
                    return (
                        <Circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#203A43" strokeWidth="2" />
                    );
                })}
            </Svg>

            {/* X-Axis Labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: width, paddingHorizontal: padding, marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>{data[0]?.label}</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>{data[data.length - 1]?.label}</Text>
            </View>
        </View>
    );
};


export default function AnalysisScreen() {
    const [loading, setLoading] = useState(true);
    // const [sales, setSales] = useState<Sale[]>([]); // We might still need sales for charts if RPC doesn't return chart data.
    // The prompt says: "Mantenha o gráfico de linhas simples por enquanto, focando em corrigir os números dos Cards."
    // If I stop fetching all sales, the Line Chart (which depends on `sales`) will break or be empty.
    // However, fetching limited sales was the bug.
    // I should probably Fetch sales for the chart separately or accept the chart might be incomplete for now?
    // User said: "Mantenha o gráfico de linhas simples por enquanto".
    // I will keep fetching `getSales()` (which is paginated 20 items) BUT I will use the RPC for the TOTAL CARDS.
    // So the Cards will be correct (Server Side), but the Chart might only show the last 20 items (Client Side).
    // This is an acceptable intermediate state as per instructions "focusing on fixing the Card numbers".

    const [sales, setSales] = useState<Sale[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    // RPC Metrics State
    const [metrics, setMetrics] = useState({ revenue: 0, costs: 0, profit: 0, receivables: 0 });

    const [activeTab, setActiveTab] = useState<'GENERAL' | 'PRODUCTS' | 'COSTS'>('GENERAL');
    const [chartType, setChartType] = useState<'BAR' | 'PIE' | 'LINE'>('LINE');

    // Expense Form States
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseType, setExpenseType] = useState<'FIXED' | 'VARIABLE'>('VARIABLE');
    const [expenseSubmitting, setExpenseSubmitting] = useState(false);

    // Settings State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [creditFee, setCreditFee] = useState('0.0');
    const [debitFee, setDebitFee] = useState('0.0');

    // Filter States
    const [dateFilterType, setDateFilterType] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);

    // Backup States
    const [showBackupModal, setShowBackupModal] = useState(false);


    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [salesData, clientsData, productsData, expensesData, settingsData] = await Promise.all([
                db.getSales(), // Still fetches only 20, used for "Recent" lists or partial charts
                db.getClients(),
                db.getProducts(),
                db.getExpenses(),
                db.getSettings()
            ]);
            setSales(salesData);
            setClients(clientsData);
            setProducts(productsData);
            setExpenses(expensesData);

            if (settingsData['credit_fee']) setCreditFee(settingsData['credit_fee']);
            if (settingsData['debit_fee']) setDebitFee(settingsData['debit_fee']);

            // Initial Metrics Load (Default Month)
            await refreshMetrics(new Date(), 'MONTH');

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // --- Date Filtering Logic ---
    // --- Date Filtering Logic ---
    const getRange = useCallback(() => {
        const start = new Date(selectedDate);
        const end = new Date(selectedDate);

        if (dateFilterType === 'DAY') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'WEEK') {
            const day = start.getDay();
            const diff = start.getDate() - day; // Sunday start
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(diff + 6);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'MONTH') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'YEAR') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    }, [selectedDate, dateFilterType]);

    // Function to calculate range and fetch RPC
    const refreshMetrics = async (date: Date, type: string) => {
        // Re-implement range logic inside here or reuse getRange helper?
        // getRange depends on state, inside loadData/useEffect it might be stale?
        // Let's rely on the effect that triggers when date/type changes.
        // Actually, we need to call this when filter changes.
    };

    useEffect(() => {
        const fetchMetricsRPC = async () => {
            const { start, end } = getRange();
            try {
                setLoading(true);
                // We pass start/end to RPC
                const data = await db.getDashboardMetrics(start, end);
                if (data) {
                    // The RPC likely returns { revenue, costs, profit }
                    // We also need 'receivables' (All time debt).
                    // Receivables usually is "Total Debt" from all clients, unrelated to date filter?
                    // Or "Receivables generated in this period"? Usually "Total Debt".
                    // Let's keep `clients` based calculation for receivables for now, as `getClients` returns all?
                    // Wait, getClients returns ALL clients for now (assuming not thousands).
                    const totalReceivables = clients.reduce((sum, client) => sum + client.totalDebt, 0);

                    setMetrics({
                        revenue: data.revenue || 0,
                        costs: data.costs || 0,
                        profit: data.profit || 0,
                        receivables: totalReceivables
                    });
                }
            } catch (e) {
                console.error("Metrics fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMetricsRPC();
    }, [selectedDate, dateFilterType, clients, getRange]); // Add clients dependency to update receivables if clients load late

    const filteredSales = useMemo(() => {
        const { start, end } = getRange();
        return sales.filter(s => {
            const d = new Date(s.timestamp);
            return d >= start && d <= end;
        });
    }, [sales, getRange]);

    const filteredExpenses = useMemo(() => {
        const { start, end } = getRange();
        return expenses.filter(e => {
            const d = new Date(e.date);
            return d >= start && d <= end;
        });
    }, [expenses, getRange]);

    const formatDateRange = () => {
        const { start, end } = getRange();
        if (dateFilterType === 'DAY') return start.toLocaleDateString('pt-BR');
        if (dateFilterType === 'WEEK') return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
        if (dateFilterType === 'MONTH') return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (dateFilterType === 'YEAR') return start.getFullYear().toString();
        return '';
    };

    const navigateDate = (direction: 'PREV' | 'NEXT') => {
        const newDate = new Date(selectedDate);
        const val = direction === 'NEXT' ? 1 : -1;

        if (dateFilterType === 'DAY') newDate.setDate(newDate.getDate() + val);
        else if (dateFilterType === 'WEEK') newDate.setDate(newDate.getDate() + (val * 7));
        else if (dateFilterType === 'MONTH') newDate.setMonth(newDate.getMonth() + val);
        else if (dateFilterType === 'YEAR') newDate.setFullYear(newDate.getFullYear() + val);

        setSelectedDate(newDate);
    };

    // --- Calculations ---

    // --- Calculations (REPLACED BY RPC) ---
    // const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.finalTotal, 0);
    // const totalReceivables = clients.reduce((sum, client) => sum + client.totalDebt, 0);
    // ...
    // Using `metrics` state now.


    // --- Chart Data Preparation ---

    const cashSalesTotal = filteredSales.filter(s => s.type === 'CASH').reduce((sum, s) => sum + s.finalTotal, 0);
    const creditSalesTotal = filteredSales.filter(s => s.type === 'CREDIT').reduce((sum, s) => sum + s.finalTotal, 0);

    // Trend Data (Group by Day)
    const trendData = useMemo(() => {
        const sortedSales = [...filteredSales].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const grouped = sortedSales.reduce((acc: any, sale) => {
            const date = new Date(sale.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            acc[date] = (acc[date] || 0) + sale.finalTotal;
            return acc;
        }, {});

        return Object.keys(grouped).map(date => ({ label: date, value: grouped[date] }));
    }, [filteredSales]);


    // --- Products Ranking ---
    const topProducts = useMemo(() => {
        const map = new Map<string, { name: string, qty: number, revenue: number, id: string }>();

        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const existing = map.get(item.productId) || { name: item.productName, qty: 0, revenue: 0, id: item.productId };
                existing.qty += item.quantity;
                existing.revenue += item.total;
                map.set(item.productId, existing);
            });
        });

        return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales]);


    // --- Expense Handler Functions ---
    const handleAddExpense = async () => {
        if (!expenseDesc || !expenseAmount) {
            Alert.alert('Erro', 'Preencha descrição e valor.');
            return;
        }

        try {
            setExpenseSubmitting(true);
            const val = parseFloat(expenseAmount.replace(',', '.'));
            if (isNaN(val) || val <= 0) {
                Alert.alert('Erro', 'Valor inválido.');
                return;
            }

            await db.addExpense({
                description: expenseDesc,
                amount: val,
                type: expenseType,
                date: new Date().toISOString()
            });

            setExpenseDesc('');
            setExpenseAmount('');
            Alert.alert('Sucesso', 'Despesa registrada!');
            loadData();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar despesa: ' + error);
        } finally {
            setExpenseSubmitting(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        Alert.alert("Excluir", "Tem certeza?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Excluir", style: "destructive", onPress: async () => {
                    await db.deleteExpense(id);
                    loadData();
                }
            }
        ]);
    };

    // --- Backup Functions ---
    const handleExportBackup = async () => {
        try {
            setLoading(true);
            const backupString = await db.exportBackup();
            await Share.share({
                message: backupString,
                title: 'Backup Gestor de Vendas'
            });
        } catch (error) {
            Alert.alert('Erro', 'Falha ao gerar backup: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setLoading(true);
            await db.saveSetting('credit_fee', creditFee.replace(',', '.'));
            await db.saveSetting('debit_fee', debitFee.replace(',', '.'));
            Alert.alert('Sucesso', 'Taxas atualizadas!');
            setShowSettingsModal(false);
        } catch (e) {
            Alert.alert('Erro', 'Falha ao salvar configurações.');
        } finally {
            setLoading(false);
        }
    };

    const handleImportBackup = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const file = result.assets[0];
            const fileContent = await FileSystem.readAsStringAsync(file.uri);

            Alert.alert(
                'Confirmar Restauração',
                'ISSO SUBSTITUIRÁ TODOS OS DADOS ATUAIS. Deseja continuar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Restaurar',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setLoading(true);
                                await db.importBackup(fileContent);
                                setShowBackupModal(false);
                                await loadData(); // Reload all data
                                Alert.alert('Sucesso', 'Dados restaurados com sucesso!');
                            } catch (error) {
                                Alert.alert('Erro', 'Arquivo de backup inválido ou corrompido.');
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );

        } catch (error) {
            Alert.alert('Erro', 'Falha ao ler arquivo: ' + error);
        }
    };


    const KPICard = ({ title, value, color, footer }: any) => (
        <View style={styles.card}>
            <Text style={styles.cardLabel}>{title}</Text>
            <Text style={[styles.cardValue, { color: color || '#1F2937' }]}>
                R$ {value.toFixed(2).replace('.', ',')}
            </Text>
            {footer && <Text style={styles.cardFooter}>{footer}</Text>}
        </View>
    );

    const renderCharts = () => {
        if (chartType === 'PIE') {
            return (
                <View>
                    <Text style={styles.chartTitleOverlay}>Vendas por Tipo</Text>
                    <SimplePieChart
                        data={[
                            { value: cashSalesTotal, color: '#10B981', label: 'À Vista' },
                            { value: creditSalesTotal, color: '#3B82F6', label: 'A Prazo' },
                        ]}
                    />
                </View>
            );
        }

        if (chartType === 'LINE') {
            return (
                <View>
                    <Text style={styles.chartTitleOverlay}>Evolução de Vendas</Text>
                    <SimpleLineChart data={trendData.length > 0 ? trendData : [{ label: 'Hoje', value: 0 }]} />
                </View>
            );
        }

        // BAR CHART
        const maxVal = Math.max(cashSalesTotal, creditSalesTotal, 1);
        const cashH = (cashSalesTotal / maxVal) * 150;
        const creditH = (creditSalesTotal / maxVal) * 150;

        return (
            <View>
                <Text style={styles.chartTitleOverlay}>Comparativo Diário</Text>
                <View style={styles.barChartContainer}>
                    <View style={styles.barWrapper}>
                        <Text style={styles.barValueLabel}>R$ {cashSalesTotal.toFixed(0)}</Text>
                        <View style={[styles.bar, { height: Math.max(cashH, 4), backgroundColor: '#10B981' }]} />
                        <Text style={styles.barLabel}>À Vista</Text>
                    </View>

                    <View style={styles.barWrapper}>
                        <Text style={styles.barValueLabel}>R$ {creditSalesTotal.toFixed(0)}</Text>
                        <View style={[styles.bar, { height: Math.max(creditH, 4), backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.barLabel}>A Prazo</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
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
                        onPress={() => setShowDateFilterModal(true)}
                    >
                        <Calendar size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.monthText}>
                            {formatDateRange()}
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
                    <TouchableOpacity style={styles.backupBtnSmall} onPress={() => setShowBackupModal(true)}>
                        <Database size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            >
                {activeTab === 'GENERAL' && (
                    <>
                        {/* KPI Grid */}
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

                        {/* Chart Section */}
                        <View style={styles.chartCard}>
                            <View style={styles.chartHeader}>
                                <Text style={styles.chartTitleSection}>Visualização Gráfica</Text>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity onPress={() => setChartType('LINE')}>
                                        <Activity size={24} color={chartType === 'LINE' ? '#203A43' : '#D1D5DB'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setChartType('BAR')}>
                                        <BarChart2 size={24} color={chartType === 'BAR' ? '#203A43' : '#D1D5DB'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setChartType('PIE')}>
                                        <PieChartIcon size={24} color={chartType === 'PIE' ? '#203A43' : '#D1D5DB'} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.chartArea}>
                                {renderCharts()}
                            </View>
                        </View>
                    </>
                )}

                {activeTab === 'PRODUCTS' && (
                    <View>
                        <Text style={styles.sectionTitle}>Ranking de Vendas</Text>
                        <View style={styles.tableCard}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>Produto</Text>
                                <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'center' }]}>Qtd</Text>
                                <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'right' }]}>Total</Text>
                            </View>
                            {topProducts.length === 0 ? (
                                <Text style={{ padding: 20, textAlign: 'center', color: '#9CA3AF' }}>Nenhuma venda registrada.</Text>
                            ) : (
                                topProducts.map((p, idx) => (
                                    <View key={p.id} style={styles.tableRow}>
                                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ fontWeight: 'bold', color: '#9CA3AF', width: 20 }}>{idx + 1}</Text>
                                            <Text style={styles.tableText} numberOfLines={1}>{p.name}</Text>
                                        </View>
                                        <Text style={[styles.tableText, { textAlign: 'center' }]}>{p.qty}</Text>
                                        <Text style={[styles.tableText, { textAlign: 'right', fontWeight: 'bold' }]}>
                                            R$ {p.revenue.toFixed(2).replace('.', ',')}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                )}

                {activeTab === 'COSTS' && (
                    <View>
                        {/* Summary of Card Fees */}
                        {(() => {
                            const cardFeeExpenses = filteredExpenses.filter(e => e.type === 'CARD_FEE');
                            const cardFeeTotal = cardFeeExpenses.reduce((sum, e) => sum + e.amount, 0);

                            return (
                                <View style={styles.cardFeeCard}>
                                    <View>
                                        <Text style={styles.cardFeeTitle}>Taxas de Cartão</Text>
                                        <Text style={styles.cardFeeSubtitle}>Crédito: {creditFee}% | Débito: {debitFee}%</Text>
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                marginTop: 8,
                                                backgroundColor: '#203A43',
                                                paddingVertical: 8,
                                                paddingHorizontal: 16,
                                                borderRadius: 8,
                                                shadowColor: '#000',
                                                shadowOpacity: 0.1,
                                                shadowRadius: 2,
                                                elevation: 1
                                            }}
                                            onPress={() => setShowSettingsModal(true)}
                                        >
                                            <Server size={16} color="#FFF" style={{ marginRight: 8 }} />
                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>Alterar Taxas</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 10, color: '#6B7280' }}>Total (Período)</Text>
                                        <Text style={styles.cardFeeValue}>
                                            R$ {cardFeeTotal.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Add Expense Form */}
                        <View style={styles.formCard}>
                            <Text style={styles.formTitle}>Registrar Despesa Manual</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Descrição (ex: Aluguel)"
                                value={expenseDesc}
                                onChangeText={setExpenseDesc}
                            />
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Valor (R$)"
                                    keyboardType="numeric"
                                    value={expenseAmount}
                                    onChangeText={setExpenseAmount}
                                />
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={handleAddExpense}
                                    disabled={expenseSubmitting}
                                >
                                    {expenseSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Adicionar</Text>}
                                </TouchableOpacity>
                            </View>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    style={[styles.typeOption, expenseType === 'VARIABLE' && styles.typeOptionActive]}
                                    onPress={() => setExpenseType('VARIABLE')}
                                >
                                    <Text style={[styles.typeText, expenseType === 'VARIABLE' && styles.typeTextActive]}>Variável</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeOption, expenseType === 'FIXED' && styles.typeOptionActive]}
                                    onPress={() => setExpenseType('FIXED')}
                                >
                                    <Text style={[styles.typeText, expenseType === 'FIXED' && styles.typeTextActive]}>Fixo</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Extrato de Despesas Manuais</Text>
                        {filteredExpenses.filter(e => e.type !== 'CARD_FEE').length === 0 ? (
                            <Text style={styles.emptyText}>Nenhuma despesa manual no período.</Text>
                        ) : (
                            filteredExpenses.filter(e => e.type !== 'CARD_FEE').slice(0, 50).map((e) => (
                                <View key={e.id} style={styles.expenseRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.dot, { backgroundColor: e.type === 'FIXED' ? '#3B82F6' : '#F59E0B' }]} />
                                        <View>
                                            <Text style={styles.expenseDesc}>{e.description}</Text>
                                            <Text style={styles.expenseDate}>{new Date(e.date).toLocaleDateString('pt-BR')}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Text style={styles.expenseAmount}>- R$ {e.amount.toFixed(2)}</Text>
                                        <TouchableOpacity onPress={() => handleDeleteExpense(e.id)}>
                                            <Trash2 size={16} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Date Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showDateFilterModal}
                onRequestClose={() => setShowDateFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.filterModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filtrar Período</Text>
                            <TouchableOpacity onPress={() => setShowDateFilterModal(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4, marginBottom: 20 }}>
                            {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as const).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: dateFilterType === type ? '#fff' : 'transparent', borderRadius: 6, elevation: dateFilterType === type ? 1 : 0 }}
                                    onPress={() => setDateFilterType(type)}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: dateFilterType === type ? 'bold' : '500', color: dateFilterType === type ? '#111' : '#6B7280' }}>
                                        {type === 'DAY' ? 'Dia' : type === 'WEEK' ? 'Semana' : type === 'MONTH' ? 'Mês' : 'Ano'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10 }}>
                            <TouchableOpacity onPress={() => navigateDate('PREV')} style={styles.navBtn}>
                                <ChevronLeft size={24} color="#203A43" />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111' }}>{formatDateRange()}</Text>
                            <TouchableOpacity onPress={() => navigateDate('NEXT')} style={styles.navBtn}>
                                <ChevronRight size={24} color="#203A43" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowDateFilterModal(false)}>
                            <Text style={styles.confirmBtnText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Settings Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showSettingsModal}
                onRequestClose={() => setShowSettingsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Configurar Taxas</Text>
                            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Taxa Crédito (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={creditFee}
                            onChangeText={setCreditFee}
                            keyboardType="numeric"
                            placeholder="Ex: 2.0"
                        />

                        <Text style={styles.label}>Taxa Débito (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={debitFee}
                            onChangeText={setDebitFee}
                            keyboardType="numeric"
                            placeholder="Ex: 1.0"
                        />

                        <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveSettings}>
                            <Text style={styles.confirmBtnText}>Salvar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Backup Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showBackupModal}
                onRequestClose={() => setShowBackupModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Database size={24} color="#203A43" style={{ marginRight: 10 }} />
                                <Text style={styles.modalTitle}>Backup de Dados</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowBackupModal(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalHelperText}>
                            Exporte seus clientes, produtos e vendas para um arquivo seguro. Isso evita perda de dados se você limpar o navegador.
                        </Text>

                        <View style={{ gap: 16, marginTop: 20 }}>
                            <TouchableOpacity style={styles.exportBtn} onPress={handleExportBackup}>
                                <Download size={20} color="#fff" style={{ marginRight: 10 }} />
                                <Text style={styles.exportBtnText}>Fazer Backup (Download)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.restoreBtn} onPress={handleImportBackup}>
                                <Upload size={20} color="#203A43" style={{ marginRight: 10 }} />
                                <Text style={styles.restoreBtnText}>Restaurar Backup</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 60 : 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
    monthSelector: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    monthText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },

    tabsRow: { flexDirection: 'row', gap: 12 },
    segmentedControl: {
        flexDirection: 'row', backgroundColor: '#F3F4F6',
        borderRadius: 12, padding: 4, height: 44
    },
    segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    segmentBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    segmentText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
    segmentTextActive: { color: '#203A43', fontWeight: 'bold' },

    backupBtnSmall: {
        width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center'
    },

    content: { padding: 20 },
    gridContainer: { gap: 12, marginBottom: 20 },
    row: { flexDirection: 'row', gap: 12 },
    card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, justifyContent: 'center' },
    cardLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
    cardValue: { fontSize: 18, fontWeight: 'bold' },
    cardFooter: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

    chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, minHeight: 280 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    chartTitleSection: { fontSize: 16, fontWeight: '600', color: '#374151' },
    chartTitleOverlay: { textAlign: 'center', marginBottom: 15, color: '#6B7280', fontSize: 13, fontWeight: '500' },
    chartArea: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },

    // Bar Chart
    barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 180, width: '100%', paddingBottom: 20 },
    barWrapper: { alignItems: 'center', justifyContent: 'flex-end', height: '100%', width: 80 },
    bar: { width: 40, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    barLabel: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#4B5563' },
    barValueLabel: { marginBottom: 6, fontSize: 14, fontWeight: 'bold', color: '#374151' },

    // Tables
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12, marginTop: 8 },
    tableCard: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
    tableHeader: { backgroundColor: '#F9FAFB' },
    tableCell: { flex: 1, color: '#6B7280', fontSize: 12 },
    tableText: { flex: 1, color: '#374151', fontSize: 14 },

    // Expenses
    formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 1 },
    formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
    addBtn: { backgroundColor: '#203A43', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    addBtnText: { color: '#fff', fontWeight: 'bold' },
    typeSelector: { flexDirection: 'row', gap: 10 },
    typeOption: { flex: 1, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6 },
    typeOptionActive: { backgroundColor: '#E5E7EB' },
    typeText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    typeTextActive: { color: '#111', fontWeight: 'bold' },

    expenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    expenseDesc: { fontSize: 14, color: '#374151', fontWeight: '500' },
    expenseDate: { fontSize: 10, color: '#9CA3AF' },
    expenseAmount: { fontSize: 14, fontWeight: 'bold', color: '#EF4444' },

    // Card Fees Styles
    cardFeeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardFeeTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    cardFeeSubtitle: { fontSize: 12, color: '#9CA3AF' },
    cardFeeValue: { fontSize: 20, fontWeight: 'bold', color: '#EF4444' },

    // Modal Form Elements
    label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 16 },

    emptyText: { textAlign: 'center', color: '#9CA3AF', marginVertical: 20, fontStyle: 'italic' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
    modalHelperText: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginTop: 10 },

    exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#203A43', borderRadius: 12, elevation: 2 },
    exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 2, borderColor: '#203A43', borderRadius: 12, borderStyle: 'dashed' },
    restoreBtnText: { color: '#203A43', fontWeight: 'bold', fontSize: 16 },

    // Filter Modal specific
    filterModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, minWidth: 300 },
    navBtn: { padding: 10, backgroundColor: '#F3F4F6', borderRadius: 50 },
    confirmBtn: { backgroundColor: '#203A43', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
