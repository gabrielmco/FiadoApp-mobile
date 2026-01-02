import React, { useState, useEffect, useMemo } from 'react';
import { Search, Minus, Plus, ShoppingCart, Trash2, ArrowRight, X, ArrowLeft, Filter } from 'lucide-react';
import { Product, Client, CartItem, Sale } from '../types';
import { db } from '../services/db';
import { ProductForm } from '../components/forms/ProductForm';
import { ClientForm } from '../components/forms/ClientForm';
import { PRODUCT_DEPARTMENTS } from '../constants';
import { normalizeText } from '../utils/text';

interface NewSaleProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const NewSaleScreen: React.FC<NewSaleProps> = ({ isOpen, onClose, onComplete }) => {
  const [saleType, setSaleType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [viewStep, setViewStep] = useState<'SELECTION' | 'CART'>('SELECTION');

  // Quick Add / Filter States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('Todos');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [prods, clis] = await Promise.all([
        db.getProducts(),
        db.getClients()
      ]);
      setProducts(prods);
      setClients(clis);
      setCart([]);
      setSelectedClient(null);
      setSaleType('CASH');
      setManualTotal(null);
      setViewStep('SELECTION');
      setSearchQuery('');
      setProductQuery('');
      setDepartmentFilter('Todos');
    } catch (e) {
      console.error("Error loading sale data", e);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1, originalPrice: product.price }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const updatePrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, price: newPrice } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculatedTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const finalTotal = manualTotal !== null ? manualTotal : calculatedTotal;

  // Filter lists
  const filteredClients = clients.filter(c => normalizeText(c.name).includes(normalizeText(searchQuery)));

  const filteredProducts = products.filter(p => {
    const normalizedQuery = normalizeText(productQuery);
    const matchesSearch =
      normalizeText(p.name).includes(normalizedQuery) ||
      normalizeText(p.department || '').includes(normalizedQuery) ||
      normalizeText(p.subCategory || '').includes(normalizedQuery);

    const matchesDept = departmentFilter === 'Todos' || (p.department || 'Sem Departamento') === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const handleFinishSale = () => {
    if (saleType === 'CREDIT' && !selectedClient) {
      alert("Selecione um cliente para venda a prazo.");
      return;
    }
    if (cart.length === 0) return;

    const sale: Sale = {
      id: Date.now().toString(),
      type: saleType,
      clientId: selectedClient?.id,
      clientName: selectedClient?.name,
      items: cart.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.quantity * item.price
      })),
      subtotal: calculatedTotal,
      discountOrAdjustment: calculatedTotal - finalTotal,
      finalTotal: finalTotal,
      remainingBalance: saleType === 'CREDIT' ? finalTotal : 0,
      timestamp: new Date().toISOString(),
      status: saleType === 'CASH' ? 'PAID' : 'PENDING'
    };

    // Async creation
    db.createSale(sale).then(() => {
      onComplete();
      onClose();
    }).catch(err => alert("Erro ao finalizar venda"));
  };

  const handleProductCreated = async (formData: Partial<Product>) => {
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

    try {
      await db.addProduct(commonData as any);
      const updatedProducts = await db.getProducts();
      setProducts(updatedProducts);
      setIsProductModalOpen(false);

      // Auto-add usage: find the newest product (last one added usually, but safely search by name/dept match?)
      // For simplicity, just refresh list.
    } catch (e) {
      alert("Erro ao criar produto");
    }
  };

  const handleClientCreated = async (formData: Partial<Client>) => {
    if (!formData.name) return;
    try {
      const newClient = {
        name: formData.name,
        phone: formData.phone || '',
        credit: 0,
        totalDebt: 0
      };
      await db.addClient(newClient);
      const updatedClients = await db.getClients();
      setClients(updatedClients);

      // Find the new client to select it
      // Heuristic: check name match on the updated list
      const added = updatedClients.find(c => c.name === newClient.name); // Simple match
      if (added) setSelectedClient(added);

      setIsClientModalOpen(false);
    } catch (e) {
      alert("Erro ao criar cliente");
    }
  };

  const departments = ['Todos', ...Object.keys(PRODUCT_DEPARTMENTS)];
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#F5F5F5] flex flex-col max-w-md mx-auto animate-in slide-in-from-bottom duration-200">
      {/* Custom Header with Back/Close logic */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          {viewStep === 'CART' ? (
            <button onClick={() => setViewStep('SELECTION')} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
          ) : (
            <div className="w-10"></div>
          )}
          <h2 className="text-xl font-bold text-gray-800 flex-1 text-center">Nova Venda</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <X size={24} className="text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {/* Step 1: Configuration & Selection */}
        {viewStep === 'SELECTION' && (
          <div className="space-y-6">
            {/* Toggle Type */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setSaleType('CASH')}
                className={`flex-1 py-3 text-sm font-semibold rounded-md transition-all ${saleType === 'CASH' ? 'bg-[#203A43] text-white shadow-md' : 'text-gray-400'
                  }`}
              >
                À Vista
              </button>
              <button
                onClick={() => setSaleType('CREDIT')}
                className={`flex-1 py-3 text-sm font-semibold rounded-md transition-all ${saleType === 'CREDIT' ? 'bg-[#203A43] text-white shadow-md' : 'text-gray-400'
                  }`}
              >
                A Prazo
              </button>
            </div>

            {/* Client Select (if Credit) */}
            {saleType === 'CREDIT' && (
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                  <button onClick={() => setIsClientModalOpen(true)} className="text-brand-mid bg-blue-50 p-1 rounded hover:bg-blue-100">
                    <Plus size={16} />
                  </button>
                </div>
                {!selectedClient ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {filteredClients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="w-full text-left p-2 hover:bg-blue-50 text-gray-700 text-sm border-b last:border-0"
                        >
                          {client.name}
                          {client.credit > 0 && <span className="ml-2 text-green-600 text-xs">(Crédito: {formatCurrency(client.credit)})</span>}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="font-bold text-blue-900">{selectedClient.name}</span>
                    <button onClick={() => setSelectedClient(null)} className="text-xs text-red-500 font-semibold">Alterar</button>
                  </div>
                )}
              </div>
            )}

            {/* Product Select */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-700">Adicionar Produtos</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`p-2 rounded-lg ${departmentFilter !== 'Todos' ? 'bg-brand-mid text-white' : 'bg-white border text-gray-500'}`}
                  >
                    <Filter size={18} />
                  </button>
                  <button
                    onClick={() => setIsProductModalOpen(true)}
                    className="bg-brand-mid text-white p-2 rounded-lg shadow-sm"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {departmentFilter !== 'Todos' && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Filtrando por:</span>
                  <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-700 flex items-center gap-1">
                    {departmentFilter}
                    <button onClick={() => setDepartmentFilter('Todos')}><X size={12} /></button>
                  </span>
                </div>
              )}

              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-mid outline-none bg-white shadow-sm"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2 h-64 overflow-y-auto pb-20">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800">{product.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{product.department || 'Geral'}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{formatCurrency(product.price)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-brand-mid text-white p-2 rounded-full hover:bg-brand-end active:scale-95 transition-transform"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Cart Review */}
        {viewStep === 'CART' && (
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded text-gray-600"><Minus size={16} /></button>
                    <span className="text-sm font-bold w-6 text-center text-brand-mid">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded text-gray-600"><Plus size={16} /></button>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 px-2 rounded-lg border border-gray-200">
                    <button onClick={() => updatePrice(item.id, item.price - 0.5)} className="text-gray-400 hover:text-gray-600"><Minus size={12} /></button>
                    <input
                      type="number"
                      className="w-16 text-right border-none outline-none font-medium bg-transparent text-gray-800 py-1"
                      value={item.price}
                      onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                    />
                    <button onClick={() => updatePrice(item.id, item.price + 0.5)} className="text-gray-400 hover:text-gray-600"><Plus size={12} /></button>
                  </div>
                </div>
              </div>
            ))}

            {/* Totals Section */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-blue-100 mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-sm">Soma dos itens</span>
                <span className="font-semibold text-gray-600 line-through decoration-gray-400 decoration-1 text-sm">
                  {manualTotal !== null ? formatCurrency(calculatedTotal) : ''}
                </span>
              </div>

              <div className="flex justify-between items-end mb-4">
                <span className="text-xl font-bold text-brand-mid">Total Final</span>
                <div className="text-right">
                  <input
                    type="number"
                    value={finalTotal}
                    onChange={(e) => setManualTotal(parseFloat(e.target.value))}
                    className="text-3xl font-bold text-brand-end text-right w-32 border-b-2 border-brand-mid outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Adjustment Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setManualTotal(finalTotal - 1)}
                  className="flex-1 py-3 bg-red-50 text-red-600 text-lg font-bold rounded-lg border border-red-100 hover:bg-red-100"
                >
                  -
                </button>
                <button
                  onClick={() => setManualTotal(finalTotal + 1)}
                  className="flex-1 py-3 bg-green-50 text-green-600 text-lg font-bold rounded-lg border border-green-100 hover:bg-green-100"
                >
                  +
                </button>
              </div>
              {selectedClient?.credit > 0 && saleType === 'CREDIT' && (
                <div className="mt-2 text-xs text-blue-600 text-center font-medium bg-blue-50 p-2 rounded">
                  Cliente possui {formatCurrency(selectedClient.credit)} de crédito que será abatido.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-[70] max-w-md mx-auto">
        {viewStep === 'SELECTION' ? (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-brand-mid text-white p-2 rounded-full relative">
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Total Estimado</span>
                <span className="font-bold text-gray-800">{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
            <button
              onClick={() => setViewStep('CART')}
              disabled={cart.length === 0}
              className="bg-brand-mid text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Revisar <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleFinishSale}
              className="w-full bg-brand-end text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-900/20"
            >
              Finalizar Venda
            </button>
          </div>
        )}
      </div>

      {/* QUICK ADD MODALS */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-md max-h-[85vh] h-auto sm:rounded-2xl rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Novo Produto Rápido</h2>
              <button onClick={() => setIsProductModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <ProductForm
              onSubmit={handleProductCreated}
              onCancel={() => setIsProductModalOpen(false)}
            />
          </div>
        </div>
      )}

      {isClientModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-md h-[auto] sm:rounded-2xl rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Novo Cliente Rápido</h2>
              <button onClick={() => setIsClientModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <ClientForm
              onSubmit={handleClientCreated}
              onCancel={() => setIsClientModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* FILTER DEPARTMENT MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setIsFilterModalOpen(false)}>
          <div className="bg-white w-full max-w-sm p-6 rounded-t-2xl sm:rounded-xl animate-in slide-in-from-bottom shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-800">Filtrar por Departamento</h3>
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
    </div>
  );
};
