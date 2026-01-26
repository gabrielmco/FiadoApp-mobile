import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, Line, Polyline } from 'react-native-svg';
import { Activity, BarChart2, PieChart as PieChartIcon } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- Internal Chart Components ---

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

    const maxValue = Math.max(...data.map(d => d.value), 10);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <Svg width={width} height={height}>
                <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="2" />
                <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="2" />
                <Polyline
                    points={points}
                    fill="none"
                    stroke="#203A43"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
                    if (data.length > 20 && i % Math.ceil(data.length / 20) !== 0) return null;
                    return (
                        <Circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#203A43" strokeWidth="2" />
                    );
                })}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: width, paddingHorizontal: padding, marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>{data[0]?.label}</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>{data[data.length - 1]?.label}</Text>
            </View>
        </View>
    );
};

// --- Main Exported Component ---

interface SalesChartProps {
    chartType: 'BAR' | 'PIE' | 'LINE';
    setChartType: (type: 'BAR' | 'PIE' | 'LINE') => void;
    data: {
        trendData: { label: string, value: number }[];
        cashSales: number;
        creditSales: number;
    };
}

export const SalesChart = ({ chartType, setChartType, data }: SalesChartProps) => {

    const renderChartContent = () => {
        if (chartType === 'PIE') {
            return (
                <View>
                    <Text style={styles.chartTitleOverlay}>Vendas por Tipo</Text>
                    <SimplePieChart
                        data={[
                            { value: data.cashSales, color: '#10B981', label: 'À Vista' },
                            { value: data.creditSales, color: '#3B82F6', label: 'A Prazo' },
                        ]}
                    />
                </View>
            );
        }

        if (chartType === 'LINE') {
            return (
                <View>
                    <Text style={styles.chartTitleOverlay}>Evolução de Vendas</Text>
                    <SimpleLineChart data={data.trendData.length > 0 ? data.trendData : [{ label: 'Hoje', value: 0 }]} />
                </View>
            );
        }

        // BAR CHART
        const maxVal = Math.max(data.cashSales, data.creditSales, 1);
        const cashH = (data.cashSales / maxVal) * 150;
        const creditH = (data.creditSales / maxVal) * 150;

        return (
            <View>
                <Text style={styles.chartTitleOverlay}>Comparativo Diário</Text>
                <View style={styles.barChartContainer}>
                    <View style={styles.barWrapper}>
                        <Text style={styles.barValueLabel}>R$ {data.cashSales.toFixed(0)}</Text>
                        <View style={[styles.bar, { height: Math.max(cashH, 4), backgroundColor: '#10B981' }]} />
                        <Text style={styles.barLabel}>À Vista</Text>
                    </View>

                    <View style={styles.barWrapper}>
                        <Text style={styles.barValueLabel}>R$ {data.creditSales.toFixed(0)}</Text>
                        <View style={[styles.bar, { height: Math.max(creditH, 4), backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.barLabel}>A Prazo</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
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
                {renderChartContent()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    chartCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        marginBottom: 24,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    chartTitleSection: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    chartArea: {
        alignItems: 'center',
    },
    chartTitleOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    // Bar Chart Styles
    barChartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: 180,
        gap: 40,
        marginTop: 20,
    },
    barWrapper: {
        alignItems: 'center',
        width: 60,
    },
    bar: {
        width: 40,
        borderRadius: 8,
        marginBottom: 8,
    },
    barLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4B5563',
    },
    barValueLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
});
