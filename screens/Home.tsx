import React, { useEffect, useState } from 'react';
import { Plus, UserPlus, PackagePlus, Wallet, User, Clock, ArrowUpRight, Check, AlertCircle, Edit2 } from 'lucide-react';
import { Sale } from '../types';
import { db } from '../services/db';
import { Modal } from '../components/ui/Modal';
import { SCREENS } from '../constants';
import { EditSaleModal } from '../components/modals/EditSaleModal';


interface HomeProps {
  onNavigate: (screen: string) => void;
  onRequestNewSale: () => void;
  initialSales?: Sale[];
}

export const HomeScreen: React.FC<HomeProps> = ({ onNavigate, onRequestNewSale, initialSales = [] }) => {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [historyTab, setHistoryTab] = useState<'ALL' | 'CASH' | 'CREDIT'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);


  const refreshSales = async () => {
    try {
      const allSales = await db.getSales();
      setSales(allSales);
    } catch (e) {
      console.error("Failed to load sales", e);
    }
  };

  useEffect(() => {
    refreshSales();
  }, []);

  const filteredSales = sales.filter(s => {
    if (historyTab === 'ALL') return true;
    return s.type === historyTab;
  }).slice(0, 20); // Limit to 20 for feed

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="pb-6">
      {/* Header Gradient */}
      <div className="bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364] pt-12 pb-8 px-6 rounded-b-[2rem] shadow-lg text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-light opacity-90">Olá,</h1>
            <h2 className="text-3xl font-bold mt-1">Bem-vindo</h2>
          </div>
        </div>


        {/* Main Action - Floating effect within header */}
        <div className="mt-8">
          <button
            onClick={onRequestNewSale}
            className="w-full bg-white text-[#203A43] py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 font-bold text-lg hover:bg-gray-50 transition-transform active:scale-95"
          >
            <div className="bg-[#203A43] text-white p-1 rounded-full">
              <Plus size={24} />
            </div>
            Nova Venda
          </button>
        </div>
      </div>

      <div className="px-6 mt-6">
        {/* Secondary Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => onNavigate('clients_add')}
            className="flex-1 flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors"
          >
            <UserPlus size={24} className="text-[#2C5364] mb-2" />
            <span className="text-xs font-semibold text-gray-600">Novo Cliente</span>
          </button>
          <button
            onClick={() => onNavigate('products_add')}
            className="flex-1 flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors"
          >
            <PackagePlus size={24} className="text-[#2C5364] mb-2" />
            <span className="text-xs font-semibold text-gray-600">Novo Produto</span>
          </button>
        </div>

        {/* Recent History Tabs */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            Histórico
          </h3>
        </div>

        <div className="flex bg-gray-200 p-1 rounded-lg mb-4">
          <button
            onClick={() => setHistoryTab('ALL')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${historyTab === 'ALL' ? 'bg-white shadow text-[#203A43]' : 'text-gray-500'}`}
          >
            Tudo
          </button>
          <button
            onClick={() => setHistoryTab('CASH')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${historyTab === 'CASH' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
          >
            À Vista/Balcão
          </button>
          <button
            onClick={() => setHistoryTab('CREDIT')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${historyTab === 'CREDIT' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
          >
            A Prazo
          </button>
        </div>

        <div className="space-y-3">
          {filteredSales.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Nenhuma venda encontrada.</div>
          ) : (
            filteredSales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${sale.type === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {sale.type === 'CASH' ? <Wallet size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">
                      {sale.type === 'CASH' ? 'Venda de Balcão' : sale.clientName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(sale.timestamp).toLocaleDateString()} • {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[150px]">
                      {sale.items.length} itens: {sale.items.map(i => i.productName).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{formatCurrency(sale.finalTotal)}</p>
                  {sale.type === 'CREDIT' && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${sale.remainingBalance === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {sale.remainingBalance === 0 ? 'Pago' : 'Pendente'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedSale && (
        <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title="Detalhes da Venda">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Tipo</span>
              <span className={`font-bold ${selectedSale.type === 'CASH' ? 'text-green-600' : 'text-blue-600'}`}>
                {selectedSale.type === 'CASH' ? 'À Vista' : 'A Prazo'}
              </span>
              {(selectedSale.type === 'CASH' || selectedSale.type === 'CREDIT') && (
                <button
                  onClick={() => {
                    setEditingSale(selectedSale);
                    setSelectedSale(null);
                  }}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs font-bold text-gray-700"
                >
                  <Edit2 size={12} /> Editar
                </button>
              )}
            </div>
            {selectedSale.clientName && (

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Cliente</span>
                <span className="font-bold text-gray-800">{selectedSale.clientName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Data</span>
              <span className="font-medium text-gray-800">{new Date(selectedSale.timestamp).toLocaleString()}</span>
            </div>
          </div>

          <h3 className="font-bold text-gray-700 mb-2">Itens</h3>
          <div className="space-y-2 mb-6">
            {selectedSale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-gray-100 pb-2">
                <div>
                  <p className="font-medium text-gray-800">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                </div>
                <p className="font-bold text-gray-700">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <span className="text-lg font-bold text-gray-800">Total</span>
            <span className="text-xl font-bold text-brand-mid">{formatCurrency(selectedSale.finalTotal)}</span>
          </div>
        </Modal>
      )}
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={async (updatedItems) => {
            await db.updateSale(editingSale.id, updatedItems);
            setEditingSale(null);
            await refreshSales();
          }}
        />
      )}
    </div>
  );
};
