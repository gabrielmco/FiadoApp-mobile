import React, { useState } from 'react';
import { X, Trash2, Minus, Plus } from 'lucide-react';
import { Sale } from '../../types';

interface EditSaleModalProps {
    sale: Sale;
    onClose: () => void;
    onSave: (updatedItems: any[]) => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose, onSave }) => {
    // Deep copy to avoid direct mutation before save
    const [items, setItems] = useState(JSON.parse(JSON.stringify(sale.items)));

    const updateQty = (idx: number, delta: number) => {
        const newItems = [...items];
        newItems[idx].quantity = Math.max(0, newItems[idx].quantity + delta);
        if (newItems[idx].quantity === 0) {
            newItems.splice(idx, 1);
        } else {
            newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
        }
        setItems(newItems);
    };

    const updatePrice = (idx: number, newPrice: number) => {
        const newItems = [...items];
        newItems[idx].unitPrice = newPrice;
        newItems[idx].total = newItems[idx].quantity * newPrice;
        setItems(newItems);
    };

    const newTotal = items.reduce((acc: number, i: any) => acc + i.total, 0);
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white w-full max-w-md max-h-[90vh] h-auto sm:rounded-2xl rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Editar Venda</h2>
                        <p className="text-xs text-gray-500">{new Date(sale.timestamp).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 && <p className="text-center text-red-500 py-4">A venda ficará vazia (R$ 0,00).</p>}
                    {items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-gray-700">{item.productName}</span>
                                <button onClick={() => updateQty(idx, -item.quantity)} className="text-red-400"><Trash2 size={16} /></button>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded">
                                    <button onClick={() => updateQty(idx, -1)} className="p-1"><Minus size={14} className="text-gray-600" /></button>
                                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQty(idx, 1)} className="p-1"><Plus size={14} className="text-gray-600" /></button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Preço Un:</span>
                                    <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={e => updatePrice(idx, parseFloat(e.target.value))}
                                        className="w-16 bg-gray-50 border border-gray-200 rounded px-1 py-1 text-right text-sm font-bold outline-none focus:border-brand-mid"
                                    />
                                </div>
                            </div>
                            <p className="text-right text-sm font-bold mt-2 text-brand-mid">{formatCurrency(item.total)}</p>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-500 text-sm">Novo Total</span>
                        <span className="text-xl font-bold text-gray-800">{formatCurrency(newTotal)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-4 text-center">
                        Alterações no valor ajustarão automaticamente a dívida do cliente (se houver).
                    </div>
                    <button
                        onClick={() => onSave(items)}
                        className="w-full bg-brand-mid text-white py-3 rounded-xl font-bold shadow-lg"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};
