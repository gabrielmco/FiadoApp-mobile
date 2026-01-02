import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { PRODUCT_DEPARTMENTS } from '../../constants';
import { Trash2 } from 'lucide-react';

interface ProductFormProps {
    initialData?: Product;
    onSubmit: (data: Partial<Product>) => void;
    onDelete?: () => void;
    onCancel: () => void;
    isEditing?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSubmit, onDelete, onCancel, isEditing }) => {
    const [form, setForm] = useState<Partial<Product>>({
        department: '',
        subCategory: '',
        unit: 'UN',
        category: '', // Legacy support
        animalType: '' // Legacy support,
    });

    useEffect(() => {
        if (initialData) {
            setForm(initialData);
        } else {
            // Default to first department
            const firstDept = Object.keys(PRODUCT_DEPARTMENTS)[0];
            const firstSub = PRODUCT_DEPARTMENTS[firstDept as keyof typeof PRODUCT_DEPARTMENTS][0];
            setForm({
                department: firstDept,
                subCategory: firstSub,
                unit: 'UN',
                category: 'Outros',
                animalType: 'Geral'
            });
        }
    }, [initialData]);

    const handleSubmit = () => {
        if (!form.name || !form.price || !form.department) {
            alert("Preencha nome, preço e departamento.");
            return;
        }
        onSubmit(form);
    };

    const departments = Object.keys(PRODUCT_DEPARTMENTS);
    const units = ['UN', 'KG', 'LT', 'CX', 'MT', 'PAR'];

    // Get available subcategories based on selected department in form
    const currentSubcategories = form.department && (PRODUCT_DEPARTMENTS as any)[form.department]
        ? (PRODUCT_DEPARTMENTS as any)[form.department]
        : [];

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nome (Obrigatório)</label>
                    <input
                        type="text"
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-mid focus:ring-1 focus:ring-brand-mid"
                        value={form.name || ''}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Ex: Ração Premium"
                    />
                </div>

                {/* Department / Subcategory */}
                <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Departamento</label>
                        <select
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-mid"
                            value={form.department || ''}
                            onChange={e => {
                                const newDept = e.target.value;
                                const newSub = (PRODUCT_DEPARTMENTS as any)[newDept]?.[0] || '';
                                setForm({ ...form, department: newDept, subCategory: newSub });
                            }}
                        >
                            <option value="" disabled>Selecione...</option>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {form.department && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Subcategoria</label>
                            <select
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-mid"
                                value={form.subCategory || ''}
                                onChange={e => setForm({ ...form, subCategory: e.target.value })}
                            >
                                {currentSubcategories.map((sub: string) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Preço Venda</label>
                        <input
                            type="number"
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-mid focus:ring-1 focus:ring-brand-mid"
                            value={form.price || ''}
                            onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Custo (Opcional)</label>
                        <input
                            type="number"
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-mid focus:ring-1 focus:ring-brand-mid"
                            value={form.cost || ''}
                            onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) })}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase">Unidade</label>
                    <select
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none"
                        value={form.unit}
                        onChange={e => setForm({ ...form, unit: e.target.value as any })}
                    >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>

                <div className="h-6"></div> {/* Reduced spacer */}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-brand-mid text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20"
                >
                    {isEditing ? 'Salvar Alterações' : 'Salvar Produto'}
                </button>
                {isEditing && onDelete && (
                    <button
                        onClick={onDelete}
                        className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold mt-2 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> Excluir Produto
                    </button>
                )}
            </div>
        </div>
    );
};
