import React from 'react';
import { Home, Users, Package, BarChart2 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

import { SCREENS } from '../constants';

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const navItems = [
    { id: SCREENS.HOME, icon: Home, label: 'Home' },
    { id: SCREENS.CLIENTS, icon: Users, label: 'Clientes' },
    { id: SCREENS.PRODUCTS, icon: Package, label: 'Produtos' },
    { id: SCREENS.ANALYSIS, icon: BarChart2, label: 'Análise' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-800">
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 relative shadow-2xl flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-16">
          {children}
        </main>

        {/* Sticky Bottom Nav */}
        <nav className="fixed bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50 max-w-md w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center space-y-1 transition-colors duration-200 ${isActive ? 'text-[#203A43]' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
