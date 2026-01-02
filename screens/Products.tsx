import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Edit2, Filter, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { db } from '../services/db';
import { PRODUCT_DEPARTMENTS } from '../constants';
import { ProductForm } from '../components/forms/ProductForm';
import { normalizeText } from '../utils/text';

interface ProductsProps {
    initialProducts?: Product[];
}

export const ProductsScreen: React.FC<ProductsProps> = ({ initialProducts = [] }) => {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const [departmentFilter, setDepartmentFilter] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    const loadProducts = async () => {
        try {
            const data = await db.getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
        }
    };

    const departments = ['Todos', ...Object.keys(PRODUCT_DEPARTMENTS)];

    // Computing filtered results
    const filtered = useMemo(() => {
        return products.filter(p => {
            const normalizedSearch = normalizeText(debouncedSearch);
            const matchesSearch =
                normalizeText(p.name).includes(normalizedSearch) ||
                normalizeText(p.department || '').includes(normalizedSearch) ||
                normalizeText(p.subCategory || '').includes(normalizedSearch);

            const productDept = p.department || 'Sem Departamento';
            const matchesDept = departmentFilter === 'Todos' || productDept === departmentFilter;
            return matchesSearch && matchesDept;
        });
    }, [products, debouncedSearch, departmentFilter]);


    const handleOpenModal = (product?: Product) => {
        setEditingProduct(product); // undefined if adding
        setIsModalOpen(true);
    };

    const handleSave = async (formData: Partial<Product>) => {
        try {
            const commonData = {
                name: formData.name,
                department: formData.department,
                subCategory: formData.subCategory,
                category: formData.category || 'Outros',
                animalType: formData.animalType || 'Geral',
                price: Number(formData.price),
                cost: Number(formData.cost || 0),
                unit: (formData.unit as any) || 'UN',
                stock: formData.trackStock ? Number(formData.stock) : 0,
                trackStock: Boolean(formData.trackStock),
            };

            if (editingProduct) {
                const updated = { ...editingProduct, ...commonData } as Product;
                await db.updateProduct(updated);
            } else {
                await db.addProduct(commonData as any);
            }
            await loadProducts(); // Refresh list
            setIsModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar produto");
        }
    };

    const handleDelete = async () => {
        if (!editingProduct) return;
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await db.deleteProduct(editingProduct.id);
                await loadProducts();
                setIsModalOpen(false);
            } catch (e) {
                alert("Erro ao excluir produto");
            }
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="p-6 pt-10 pb-24 h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
                <button onClick={() => handleOpenModal()} className="bg-brand-mid text-white p-2 rounded-lg shadow-md hover:bg-brand-end">
                    <Plus size={20} />
                </button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-mid outline-none"
                />
            </div>

            {/* Filter Button */}
            <div className="mb-4">
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="w-full flex items-center justify-between bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm hover:border-brand-mid group"
                >
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Filter size={18} />
                        <span>Departamento</span>
                    </div>
                    <span className="bg-brand-mid text-white text-xs px-2 py-1 rounded font-bold">{departmentFilter}</span>
                </button>
            </div>

            {/* Filter Modal */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setIsFilterModalOpen(false)}>
                    <div className="bg-white w-full max-w-sm p-6 rounded-t-2xl sm:rounded-xl animate-in slide-in-from-bottom shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-800">Selecione um Departamento</h3>
                            <button onClick={() => setIsFilterModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {departments.map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => { setDepartmentFilter(dept); setIsFilterModalOpen(false); }}
                                    className={`py-3 px-4 rounded-lg text-sm font-bold transition-all text-left ${departmentFilter === dept
                                        ? 'bg-brand-mid text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {dept}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3 overflow-y-auto pb-20">
                {filtered.map(product => (
                    <div key={product.id} onClick={() => handleOpenModal(product)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-[0.99] transition-transform cursor-pointer">
                        <div>
                            <h3 className="font-bold text-gray-800">{product.name}</h3>
                            <div className="flex gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                                {product.department && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{product.department}</span>}
                                {product.subCategory && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{product.subCategory}</span>}
                                {!product.department && <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100">Sem Depto.</span>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-brand-mid">{formatCurrency(product.price)}</p>
                            <Edit2 size={14} className="ml-auto mt-2 text-gray-300" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
                    <div className="bg-white w-full max-w-md max-h-[80vh] h-auto sm:rounded-2xl rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
                        </div>

                        <ProductForm
                            initialData={editingProduct || undefined}
                            onSubmit={handleSave}
                            onDelete={editingProduct ? handleDelete : undefined}
                            onCancel={() => setIsModalOpen(false)}
                            isEditing={!!editingProduct}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
