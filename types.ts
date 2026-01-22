export type SaleType = 'CASH' | 'CREDIT';

export interface Product {
  id: string;
  name: string;
  department?: string;
  subCategory?: string;
  category?: string;
  animalType?: string;
  price: number;
  cost?: number;
  unit: 'UN' | 'KG' | 'SC' | 'CX' | 'LT' | 'PAR'; // Adicionei SC (Saco)
  stock?: number;
  trackStock?: boolean;
}

// Interface isolada para o Item da Venda (Corrige o erro do 'i')
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CartItem extends Product {
  quantity: number;
  originalPrice: number;
  discount?: number;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  credit: number;
  totalDebt: number;
  lastInteraction: string;
  oldestDebtDays?: number;
}

export interface Sale {
  id: string;
  clientId?: string;
  clientName?: string;
  type: SaleType;
  items: SaleItem[]; // Usa a interface nova aqui
  subtotal: number;
  discountOrAdjustment: number;
  finalTotal: number;
  remainingBalance: number;
  timestamp: string;
  status: 'PAID' | 'PENDING' | 'PARTIAL';
}

export interface PaymentRecord {
  id: string;
  clientId: string;
  amount: number;
  timestamp: string;
  usedCredit: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  type: 'FIXED' | 'VARIABLE';
  date: string;
}

export interface BackupData {
  clients: Client[];
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  expenses: Expense[];
  payments: PaymentRecord[];
  timestamp: string;
  version: string;
}