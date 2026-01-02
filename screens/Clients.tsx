import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, AlertCircle, CheckCircle, Wallet, UserPlus, X, Filter, Trash2, Edit2 } from 'lucide-react';

import { Client, Sale } from '../types';
import { db } from '../services/db';
import { Modal } from '../components/ui/Modal';
import { ClientForm } from '../components/forms/ClientForm';
import { EditSaleModal } from '../components/modals/EditSaleModal';


interface ClientsProps {
    initialClients?: Client[];
    initialSales?: Sale[];
}

export const ClientsScreen: React.FC<ClientsProps> = ({ initialClients = [], initialSales = [] }) => {
    const [clients, setClients] = useState<Client[]>(initialClients);
    // Enriched logic needs to run on init if we have props, or just assume props are raw and need enriching?
    // Using a useEffect to enrich mock data or doing it inline?
    // For simplicity, let's just set them. If they need "oldestDebtDays" we might need to calc it.
    // However, the mocks in constants already seem to have some structure, but maybe not calculated fields.
    // The previous code enriched them. Let's replicate strict enrichment if needed.
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filter Logic
    const [filterTab, setFilterTab] = useState<'ALL' | 'LATE' | 'PENDING' | 'PAID'>('ALL');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // New Client State
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    /*
    useEffect(() => {
        refreshClients();
    }, [isAddModalOpen]);
    */

    // Re-calculating enriched data from props if needed, or if we want to support the calculation
    useEffect(() => {
        if (initialClients.length > 0) {
            const enriched = initialClients.map(c => {
                const clientSales = initialSales.filter(s => s.clientId === c.id && s.remainingBalance > 0);
                let oldestDebtDays = 0;
                if (clientSales.length > 0) {
                    const oldestDate = clientSales.reduce((oldest, current) => {
                        return new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest;
                    }).timestamp;
                    const diffTime = Math.abs(Date.now() - new Date(oldestDate).getTime());
                    oldestDebtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
                return { ...c, oldestDebtDays };
            });
            setClients(enriched);
        }
    }, [initialClients, initialSales]);

    const refreshClients = async () => {
        try {
            const [allClients, allSales] = await Promise.all([
                db.getClients(),
                db.getSales()
            ]);

            const enriched = allClients.map(c => {
                const clientSales = allSales.filter(s => s.clientId === c.id && s.remainingBalance > 0);
                let oldestDebtDays = 0;
                if (clientSales.length > 0) {
                    const oldestDate = clientSales.reduce((oldest, current) => {
                        return new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest;
                    }).timestamp;
                    const diffTime = Math.abs(Date.now() - new Date(oldestDate).getTime());
                    oldestDebtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
                return { ...c, oldestDebtDays };
            });
            setClients(enriched);
        } catch (e) {
            console.error("Failed to refresh clients", e);
        }
    };

    const handleOpenAddModal = () => {
        setEditingClient(null);
        setNewClientName('');
        setNewClientPhone('');
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (client: Client, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingClient(client);
        setNewClientName(client.name);
        setNewClientPhone(client.phone || '');
        setIsAddModalOpen(true);
    };

    const handleSaveClient = async (formData: Partial<Client>) => {
        if (!formData.name) return;

        try {
            if (editingClient) {
                await db.updateClient(editingClient.id, {
                    name: formData.name,
                    phone: formData.phone || ''
                });
            } else {
                const newClient: Partial<Client> = {
                    name: formData.name,
                    phone: formData.phone || '',
                    credit: 0,
                    totalDebt: 0,
                };
                await db.addClient(newClient);
            }
            setNewClientName('');
            setNewClientPhone('');
            setEditingClient(null);
            setIsAddModalOpen(false);
            await refreshClients();
        } catch (e) {
            alert("Erro ao salvar cliente");
        }
    };

    const handleDeleteClient = async () => {
        if (!editingClient) return;
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await db.deleteClient(editingClient.id);
                setIsAddModalOpen(false);
                setEditingClient(null);
                await refreshClients();
            } catch (e) {
                alert("Erro ao excluir cliente");
            }
        }
    };

    const filtered = useMemo(() => {
        return clients.filter(c => {
            const matchesName = c.name.toLowerCase().includes(debouncedSearch.toLowerCase());
            if (!matchesName) return false;

            if (filterTab === 'LATE') return (c.oldestDebtDays || 0) > 30 && c.totalDebt > 0;
            if (filterTab === 'PENDING') return (c.oldestDebtDays || 0) <= 30 && c.totalDebt > 0;
            if (filterTab === 'PAID') return c.totalDebt === 0;
            return true; // ALL
        });
    }, [clients, debouncedSearch, filterTab]);


    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const activeClientData = clients.find(c => c.id === selectedClientId) || null;

    const getFilterLabel = (tab: string) => {
        switch (tab) {
            case 'ALL': return 'Todos';
            case 'LATE': return 'Atrasados (>30d)';
            case 'PENDING': return 'Pendentes';
            case 'PAID': return 'Em Dia';
            default: return 'Filtros';
        }
    };

    return (
        <div className="p-6 pt-10 pb-24 h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Meus Clientes</h1>
                <button onClick={handleOpenAddModal} className="bg-brand-mid text-white p-2 rounded-lg shadow-md hover:bg-brand-end">
                    <UserPlus size={20} />
                </button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-mid outline-none"
                />
            </div>

            {/* Filter Button */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 w-full justify-center"
                >
                    <Filter size={16} />
                    {getFilterLabel(filterTab)}
                </button>
            </div>

            {/* Filter Modal */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setIsFilterModalOpen(false)}>
                    <div className="bg-white w-full max-w-sm p-6 rounded-t-2xl sm:rounded-xl animate-in slide-in-from-bottom shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-4 text-gray-800">Filtrar Clientes</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => { setFilterTab('ALL'); setIsFilterModalOpen(false); }} className={`p-3 rounded-lg font-bold text-left ${filterTab === 'ALL' ? 'bg-brand-mid text-white' : 'bg-gray-100 text-gray-700'}`}>Todos</button>
                            <button onClick={() => { setFilterTab('LATE'); setIsFilterModalOpen(false); }} className={`p-3 rounded-lg font-bold text-left ${filterTab === 'LATE' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Atrasados &gt; 30 dias</button>
                            <button onClick={() => { setFilterTab('PENDING'); setIsFilterModalOpen(false); }} className={`p-3 rounded-lg font-bold text-left ${filterTab === 'PENDING' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Pendentes &lt; 30 dias</button>
                            <button onClick={() => { setFilterTab('PAID'); setIsFilterModalOpen(false); }} className={`p-3 rounded-lg font-bold text-left ${filterTab === 'PAID' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Em Dia (Sem dívida)</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3 overflow-y-auto pb-20">
                {filtered.map((client) => {
                    let status = 'Em dia';
                    let statusColor = 'text-green-600 bg-green-50';

                    if (client.oldestDebtDays && client.oldestDebtDays > 30) {
                        status = `Atrasado ${client.oldestDebtDays} dias`;
                        statusColor = 'text-red-600 bg-red-50';
                    } else if (client.totalDebt > 0) {
                        status = `Pendente ${client.oldestDebtDays || 1} dias`;
                        statusColor = 'text-orange-600 bg-orange-50';
                    }

                    return (
                        <div
                            key={client.id}
                            onClick={() => setSelectedClientId(client.id)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer hover:border-brand-mid/30"
                        >
                            <div>
                                <h3 className="font-bold text-gray-800">{client.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColor}`}>
                                        {status}
                                    </span>
                                    {client.credit > 0 && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">Crédito: {formatCurrency(client.credit)}</span>}
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-gray-500">Deve</span>
                                    <span className={`font-bold ${client.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(client.totalDebt)}
                                    </span>
                                </div>
                                <button onClick={(e) => handleOpenEditModal(client, e)} className="p-2 text-gray-400 hover:text-brand-mid hover:bg-gray-100 rounded-full transition-colors">
                                    <Edit2 size={18} />
                                </button>
                                <ChevronRight size={20} className="text-gray-300" />
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Nenhum cliente encontrado.</p>}
            </div>

            {activeClientData && (
                <ClientDetailModal
                    client={activeClientData}
                    onClose={() => setSelectedClientId(null)}
                    onUpdate={refreshClients}
                />
            )}

            {/* Add Client Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                            <button onClick={() => setIsAddModalOpen(false)}><X size={24} className="text-gray-400" /></button>
                        </div>
                        <div className="p-0">
                            <ClientForm
                                initialData={editingClient || undefined}
                                onSubmit={handleSaveClient}
                                onDelete={editingClient ? handleDeleteClient : undefined}
                                onCancel={() => setIsAddModalOpen(false)}
                                isEditing={!!editingClient}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub Components ---

const ClientDetailModal: React.FC<{ client: Client; onClose: () => void; onUpdate: () => void }> = ({ client, onClose, onUpdate }) => {
    const [history, setHistory] = useState<Sale[]>([]);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Editing Sales State
    const [editingSale, setEditingSale] = useState<Sale | null>(null);

    const refreshHistory = async () => {
        const allSales = await db.getSales();
        setHistory(allSales.filter(s => s.clientId === client.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    };

    useEffect(() => {
        refreshHistory();
    }, [client, editingSale]);

    const handlePayment = async () => {
        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) return;

        try {
            await db.processPayment(client.id, amount);

            setPaymentAmount('');
            setIsPaymentModalOpen(false);
            setSuccessMsg('Pagamento confirmado!');
            setTimeout(() => setSuccessMsg(''), 3000);

            onUpdate();
            await refreshHistory();
        } catch (e) {
            alert("Erro no pagamento");
        }
    };

    const pendingSales = history.filter(s => s.remainingBalance > 0);

    let oldestDebtDays = 0;
    if (pendingSales.length > 0) {
        const oldestDate = pendingSales.reduce((oldest, current) => {
            return new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest;
        }).timestamp;
        oldestDebtDays = Math.ceil(Math.abs(Date.now() - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24));
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <>
            <Modal isOpen={!!client} onClose={onClose} title="Carteira do Cliente">
                <div className="bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364] p-6 rounded-2xl text-white shadow-xl mb-6 relative overflow-hidden transition-all duration-300">
                    <div className="relative z-10">
                        <p className="opacity-80 text-sm font-medium">Saldo Devedor Total</p>
                        <h1 className="text-4xl font-bold mt-1 tracking-tight">{formatCurrency(client.totalDebt)}</h1>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {oldestDebtDays > 30 && <span className="bg-red-500/20 border border-red-500/50 px-2 py-1 rounded text-xs flex items-center gap-1 font-bold text-red-100"><AlertCircle size={12} /> Atrasado ({oldestDebtDays} dias)</span>}
                            {client.credit > 0 && <span className="bg-blue-500/20 border border-blue-500/50 px-2 py-1 rounded text-xs font-bold text-blue-100">Crédito: {formatCurrency(client.credit)}</span>}
                            {client.totalDebt === 0 && <span className="bg-green-500/20 border border-green-500/50 px-2 py-1 rounded text-xs flex items-center gap-1 font-bold text-green-100"><CheckCircle size={12} /> Em dia</span>}
                        </div>
                    </div>
                    <Wallet className="absolute -bottom-6 -right-6 text-white opacity-5 w-40 h-40" />
                </div>

                {successMsg && (
                    <div className="mb-4 bg-green-100 text-green-800 p-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={18} />
                        <span className="font-bold text-sm">{successMsg}</span>
                    </div>
                )}

                <div className="mb-6">
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                    >
                        <div className="bg-green-100 p-2 rounded-full text-green-700">
                            <Wallet size={24} />
                        </div>
                        <span className="text-green-700 font-bold text-lg">Registrar Pagamento</span>
                    </button>
                </div>

                <div className="flex border-b border-gray-200 mb-4">
                    <button
                        onClick={() => setActiveTab('PENDING')}
                        className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'PENDING' ? 'text-brand-mid border-b-2 border-brand-mid' : 'text-gray-400'}`}
                    >
                        Pendentes
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'HISTORY' ? 'text-brand-mid border-b-2 border-brand-mid' : 'text-gray-400'}`}
                    >
                        Histórico Completo
                    </button>
                </div>

                <div className="space-y-3 pb-20">
                    {(activeTab === 'PENDING' ? pendingSales : history).map(sale => {
                        const saleAge = Math.ceil(Math.abs(Date.now() - new Date(sale.timestamp).getTime()) / (1000 * 60 * 60 * 24));
                        let isPaid = sale.remainingBalance === 0;
                        let isPartial = !isPaid && sale.remainingBalance < sale.finalTotal;
                        let badge = null;
                        if (isPaid) badge = <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Pago</span>;
                        else if (saleAge > 30) badge = <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">Atrasado</span>;

                        return (
                            <div
                                key={sale.id}
                                onClick={() => setEditingSale(sale)}
                                className="bg-white p-3 rounded-lg border border-gray-100 flex flex-col gap-2 shadow-sm cursor-pointer hover:border-brand-mid"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-gray-500 font-medium">{new Date(sale.timestamp).toLocaleDateString()}</span>
                                            {badge}
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium truncate max-w-[180px]">
                                            {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {isPaid ? (
                                            <p className="text-sm font-bold text-green-600">{formatCurrency(sale.finalTotal)}</p>
                                        ) : (
                                            <>
                                                <div className="flex flex-col items-end">
                                                    {isPartial && <span className="text-[10px] text-gray-400 line-through">{formatCurrency(sale.finalTotal)}</span>}
                                                    <p className="text-sm font-bold text-gray-800">{formatCurrency(sale.remainingBalance)}</p>
                                                    {isPartial && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                            <span className="text-[10px] font-bold text-orange-600">Falta {formatCurrency(sale.remainingBalance)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {!isPaid && (
                                    <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${isPartial ? 'bg-orange-400' : 'bg-gray-200'}`}
                                            style={{ width: `${((sale.finalTotal - sale.remainingBalance) / sale.finalTotal) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-800">Registrar Pagamento</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Valor</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="R$ 0,00"
                                autoFocus
                                className="flex-1 border-b-2 border-gray-300 focus:border-green-500 outline-none text-3xl font-bold p-2 bg-transparent text-gray-800"
                            />
                        </div>
                        <div className="flex gap-2 mb-6">
                            <button onClick={() => setPaymentAmount((prev) => String((parseFloat(prev || '0') + 10)))} className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 hover:bg-gray-200">+ R$ 10</button>
                            <button onClick={() => setPaymentAmount((prev) => String((parseFloat(prev || '0') + 50)))} className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 hover:bg-gray-200">+ R$ 50</button>
                            <button onClick={() => setPaymentAmount((prev) => String((parseFloat(prev || '0') + 100)))} className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 hover:bg-gray-200">+ R$ 100</button>
                        </div>
                        <button onClick={handlePayment} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-900/20">Confirmar Recebimento</button>
                    </div>
                </div>
            )}

            {/* Edit Sale Modal */}
            {editingSale && (
                <EditSaleModal
                    sale={editingSale}
                    onClose={() => setEditingSale(null)}
                    onSave={async (updatedItems) => {
                        await db.updateSale(editingSale.id, updatedItems);
                        setEditingSale(null);
                        onUpdate(); // Update Client Card
                    }}
                />
            )}
        </>
    );
};



