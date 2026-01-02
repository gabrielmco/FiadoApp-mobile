import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import { Trash2 } from 'lucide-react';

interface ClientFormProps {
    initialData?: Client;
    onSubmit: (data: Partial<Client>) => void;
    onDelete?: () => void;
    onCancel: () => void;
    isEditing?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSubmit, onDelete, onCancel, isEditing }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setPhone(initialData.phone || '');
        } else {
            setName('');
            setPhone('');
        }
    }, [initialData]);

    const handleSubmit = () => {
        if (!name) return;
        onSubmit({ name, phone });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6 space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
                    <input
                        type="text"
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-mid focus:ring-1 focus:ring-brand-mid text-lg"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nome Completo"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Telefone</label>
                    <input
                        type="tel"
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-mid focus:ring-1 focus:ring-brand-mid text-lg"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                    />
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white mt-auto">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-brand-mid text-white py-3 rounded-xl font-bold mt-4 shadow-lg shadow-blue-900/20"
                >
                    {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
                {isEditing && onDelete && (
                    <button
                        onClick={onDelete}
                        className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold mt-2 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> Excluir Cliente
                    </button>
                )}
            </div>
        </div>
    );
};
