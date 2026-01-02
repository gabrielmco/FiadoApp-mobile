import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { db } from '../services/db';
import { TimeRange, Expense } from '../types';
import { PieChart as PieIcon, BarChart as BarIcon, Calendar, DollarSign, Plus, Trash2, Download, Upload, Save, AlertTriangle } from 'lucide-react';

export const AnalyticsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'EXPENSES' | 'BACKUP'>('DASHBOARD');

    // Dashboard States
    const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.MONTH);
    const [chartType, setChartType] = useState<'BAR' | 'PIE' | 'LINE'>('BAR');

    // Product Analysis States
    const [productSort, setProductSort] = useState<'REVENUE' | 'PROFIT'>('REVENUE');
    const [dayFilter, setDayFilter] = useState<number | 'ALL'>('ALL'); // 0 = Sunday, 1 = Monday...

    // Expense States
    // Data States
    const [sales, setSales] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [products, setProducts] = useState<any[]>([]); // Added here

    // Inputs
    const [newExpenseDesc, setNewExpenseDesc] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [newExpenseCat, setNewExpenseCat] = useState<'FIXED' | 'VARIABLE'>('FIXED');

    // Backup Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [s, c, e, p] = await Promise.all([
                    db.getSales(),
                    db.getClients(),
                    db.getExpenses(), // Currently sync in db.ts but good to wrap or treat as data source
                    db.getProducts() // Added loading here
                ]);
                setSales(s);
                setClients(c);
                setExpenses(e);
                setProducts(p);
            } catch (err) {
                console.error(err);
            }
        };
        loadData();
    }, []);

    const handleAddExpense = () => {
        if (!newExpenseDesc || !newExpenseAmount) return;
        const expense: Expense = {
            id: Date.now().toString(),
            description: newExpenseDesc,
            amount: parseFloat(newExpenseAmount),
            category: newExpenseCat,
            date: new Date().toISOString()
        };
        db.addExpense(expense);
        setExpenses(db.getExpenses()); // Refresh local list
        setNewExpenseDesc('');
        setNewExpenseAmount('');
    };

    const handleDeleteExpense = (id: string) => {
        db.deleteExpense(id);
        setExpenses(db.getExpenses());
    };

    const handleBackup = () => {
        db.exportBackup();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const success = db.importBackup(content);
                if (success) {
                    alert("Backup restaurado com sucesso! A página será recarregada.");
                    window.location.reload();
                } else {
                    alert("Erro ao ler arquivo de backup.");
                }
            }
        };
        reader.readAsText(file);
    };

    const filteredSales = useMemo(() => {
        const now = new Date();
        return sales.filter(s => {
            const date = new Date(s.timestamp);

            // Time Range Filter
            const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
            let inTimeRange = false;
            switch (timeRange) {
                case TimeRange.DAY: inTimeRange = diffDays < 1; break;
                case TimeRange.WEEK: inTimeRange = diffDays < 7; break;
                case TimeRange.MONTH: inTimeRange = diffDays < 30; break;
                case TimeRange.QUARTER: inTimeRange = diffDays < 90; break;
                case TimeRange.YEAR: inTimeRange = diffDays < 365; break;
                default: inTimeRange = true;
            }

            // Day of Week Filter (for Product view mostly, but applied if tab is PRODUCTS)
            if (activeTab === 'PRODUCTS' && dayFilter !== 'ALL') {
                if (date.getDay() !== dayFilter) return false;
            }

            return inTimeRange;
        });
    }, [sales, timeRange, dayFilter, activeTab]);

    const kpis = useMemo(() => {
        const totalRevenue = filteredSales.reduce((acc, s) => acc + s.finalTotal, 0);
        const totalReceivable = clients.reduce((acc, c) => acc + c.totalDebt, 0);

        // Calculate total cost of goods sold
        let totalCOGS = 0;
        filteredSales.forEach(s => {
            s.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const cost = product?.cost || 0;
                totalCOGS += cost * item.quantity;
            });
        });

        // Expenses in period
        const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

        // Risk: Debt older than 30 days
        const riskAmount = sales
            .filter(s => s.remainingBalance > 0)
            .filter(s => {
                const days = Math.floor((Date.now() - new Date(s.timestamp).getTime()) / (1000 * 60 * 60 * 24));
                return days > 30;
            })
            .reduce((acc, s) => acc + s.remainingBalance, 0);

        const netProfit = totalRevenue - totalCOGS - totalExpenses;

        return { totalRevenue, totalReceivable, riskAmount, totalExpenses, netProfit, totalCOGS };
    }, [filteredSales, clients, sales, expenses, products]);

    const salesByType = useMemo(() => {
        const cash = filteredSales.filter(s => s.type === 'CASH').reduce((acc, s) => acc + s.finalTotal, 0);
        const credit = filteredSales.filter(s => s.type === 'CREDIT').reduce((acc, s) => acc + s.finalTotal, 0);
        return [
            { name: 'À Vista', value: cash, color: '#10B981' },
            { name: 'A Prazo', value: credit, color: '#3B82F6' }
        ];
    }, [filteredSales]);

    const productAnalysis = useMemo(() => {
        const map: Record<string, { name: string, quantity: number, revenue: number, cost: number, profit: number }> = {};
        const allProducts = products;

        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const product = allProducts.find(p => p.id === item.productId);
                const cost = (product?.cost || 0) * item.quantity;

                if (!map[item.productId]) {
                    map[item.productId] = {
                        name: item.productName,
                        quantity: 0,
                        revenue: 0,
                        cost: 0,
                        profit: 0
                    };
                }
                map[item.productId].quantity += item.quantity;
                map[item.productId].revenue += item.total;
                map[item.productId].cost += cost;
                map[item.productId].profit += (item.total - cost);
            });
        });

        let arr = Object.values(map);
        if (productSort === 'REVENUE') {
            arr.sort((a, b) => b.revenue - a.revenue);
        } else {
            arr.sort((a, b) => b.profit - a.profit);
        }
        return arr;
    }, [filteredSales, productSort]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const renderChart = () => {
        const data = salesByType;
        if (chartType === 'PIE') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            );
        }
        if (chartType === 'LINE') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <XAxis dataKey="name" />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    }

    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    return (
        <div className="p-6 pt-10 pb-24 h-screen flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Análise</h1>
                {/* Time Filter - Global for Dashboard and Products */}
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                    className="bg-white border border-gray-200 text-xs font-bold py-1 px-3 rounded-lg outline-none"
                >
                    {Object.values(TimeRange).map(tr => <option key={tr} value={tr}>{tr}</option>)}
                </select>
            </div>

            {/* Main Nav Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'DASHBOARD' ? 'bg-white shadow text-brand-mid' : 'text-gray-500'}`}>Geral</button>
                <button onClick={() => setActiveTab('PRODUCTS')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'PRODUCTS' ? 'bg-white shadow text-brand-mid' : 'text-gray-500'}`}>Produtos</button>
                <button onClick={() => setActiveTab('EXPENSES')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'EXPENSES' ? 'bg-white shadow text-brand-mid' : 'text-gray-500'}`}>Custos</button>
                <button onClick={() => setActiveTab('BACKUP')} className={`flex-[0.5] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'BACKUP' ? 'bg-white shadow text-brand-mid' : 'text-gray-500'}`}>
                    <Save size={14} className="mx-auto" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">

                {/* DASHBOARD VIEW */}
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Faturamento</p>
                                <p className="text-lg font-bold text-blue-600">{formatCurrency(kpis.totalRevenue)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Lucro Líquido</p>
                                <p className={`text-lg font-bold ${kpis.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(kpis.netProfit)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Total a Receber</p>
                                <p className="text-lg font-bold text-orange-500">{formatCurrency(kpis.totalReceivable)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Custos Totais</p>
                                <p className="text-lg font-bold text-gray-600">{formatCurrency(kpis.totalExpenses + kpis.totalCOGS)}</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-700">Vendas vs Tipo</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setChartType('BAR')} className={`p-1 rounded ${chartType === 'BAR' ? 'bg-gray-100 text-gray-800' : 'text-gray-400'}`}><BarIcon size={16} /></button>
                                    <button onClick={() => setChartType('PIE')} className={`p-1 rounded ${chartType === 'PIE' ? 'bg-gray-100 text-gray-800' : 'text-gray-400'}`}><PieIcon size={16} /></button>
                                </div>
                            </div>
                            <div className="h-48 w-full">
                                {renderChart()}
                            </div>
                        </div>
                    </div>
                )}

                {/* PRODUCTS VIEW */}
                {activeTab === 'PRODUCTS' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                                <Calendar size={16} className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-600 whitespace-nowrap">Filtrar Dia:</span>
                                <select
                                    value={dayFilter}
                                    onChange={(e) => setDayFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                                    className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none"
                                >
                                    <option value="ALL">Todos os Dias</option>
                                    {daysOfWeek.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-gray-700">Performance</h3>
                                <div className="flex bg-gray-100 rounded p-0.5">
                                    <button onClick={() => setProductSort('REVENUE')} className={`px-2 py-1 text-[10px] rounded font-bold ${productSort === 'REVENUE' ? 'bg-white shadow text-brand-mid' : 'text-gray-400'}`}>Faturamento</button>
                                    <button onClick={() => setProductSort('PROFIT')} className={`px-2 py-1 text-[10px] rounded font-bold ${productSort === 'PROFIT' ? 'bg-white shadow text-green-600' : 'text-gray-400'}`}>Lucro</button>
                                </div>
                            </div>

                            <div className="space-y-3 mt-4">
                                {productAnalysis.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{i + 1}</span>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{p.name}</p>
                                                <p className="text-[10px] text-gray-500">{p.quantity} vendidos</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-gray-700">{formatCurrency(productSort === 'REVENUE' ? p.revenue : p.profit)}</p>
                                            <p className="text-[10px] text-gray-400">{productSort === 'REVENUE' ? 'Vendas' : 'Lucro Est.'}</p>
                                        </div>
                                    </div>
                                ))}
                                {productAnalysis.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">Nenhuma venda neste período/dia.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* EXPENSES VIEW */}
                {activeTab === 'EXPENSES' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <DollarSign size={18} className="text-red-500" />
                                Adicionar Custo/Despesa
                            </h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Descrição (ex: Conta de Luz)"
                                    value={newExpenseDesc}
                                    onChange={e => setNewExpenseDesc(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-300"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Valor (R$)"
                                        value={newExpenseAmount}
                                        onChange={e => setNewExpenseAmount(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-300"
                                    />
                                    <select
                                        value={newExpenseCat}
                                        onChange={e => setNewExpenseCat(e.target.value as any)}
                                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold outline-none"
                                    >
                                        <option value="FIXED">Fixo</option>
                                        <option value="VARIABLE">Variável</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleAddExpense}
                                    className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Adicionar
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                            <h3 className="font-bold text-gray-700 mb-2">Despesas do Mês</h3>
                            <div className="space-y-2">
                                {expenses.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-4">Nenhuma despesa registrada.</p>
                                ) : (
                                    expenses.map(exp => (
                                        <div key={exp.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg group">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{exp.description}</p>
                                                <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{exp.category === 'FIXED' ? 'Fixo' : 'Variável'}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-red-500">- {formatCurrency(exp.amount)}</span>
                                                <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* BACKUP VIEW */}
                {activeTab === 'BACKUP' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-center">
                            <Save size={48} className="text-brand-mid mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Backup de Dados</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Exporte seus clientes, produtos e vendas para um arquivo seguro.
                                Isso evita perda de dados se você limpar o navegador.
                            </p>

                            <button
                                onClick={handleBackup}
                                className="w-full bg-brand-mid text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-brand-end transition-all mb-4"
                            >
                                <Download size={20} />
                                Fazer Backup (Download)
                            </button>

                            <input
                                type="file"
                                accept=".json"
                                ref={fileInputRef}
                                onChange={handleImport}
                                className="hidden"
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-white border-2 border-brand-mid text-brand-mid py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all"
                            >
                                <Upload size={20} />
                                Restaurar Backup
                            </button>
                        </div>

                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3">
                            <AlertTriangle className="text-red-500 shrink-0" />
                            <div>
                                <h4 className="font-bold text-red-700 text-sm">Atenção</h4>
                                <p className="text-xs text-red-600 mt-1">
                                    Ao restaurar um backup, todos os dados atuais serão substituídos pelos dados do arquivo.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
