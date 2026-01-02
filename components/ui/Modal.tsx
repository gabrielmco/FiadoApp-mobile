import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, action }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col max-w-md mx-auto animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={24} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1 overflow-y-auto bg-[#F5F5F5] p-4">
        {children}
      </div>
    </div>
  );
};
