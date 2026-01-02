export type SaleType = 'CASH' | 'CREDIT';

export interface Product {
  id: string;
  name: string;
  department?: string; // New
  subCategory?: string; // New
  category?: string; // Optional/Legacy
  animalType?: string; // Optional/Legacy
  price: number;
  cost?: number; // Optional
  unit: 'UN' | 'KG' | 'LT' | 'CX' | 'MT' | 'PAR';
  stock?: number; // Optional/Deprecated
  trackStock?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  originalPrice: number; // To track manual price edits per item
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  credit: number; // Saldo positivo (pagou a mais)
  totalDebt: number; // Saldo devedor total cache
  lastInteraction: string;
  oldestDebtDays?: number; // Derived field for UI status
}

export interface Sale {
  id: string;
  clientId?: string; // Optional if CASH
  clientName?: string; // Snapshot for history
  type: SaleType;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discountOrAdjustment: number; // Difference between calculated sum and manual final total
  finalTotal: number;
  remainingBalance: number; // For credit sales (starts equal to finalTotal)
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
  category: 'FIXED' | 'VARIABLE'; // Fixo (Agua/Luz) vs Variavel (Gasolina)
  date: string;
}

export enum TimeRange {
  DAY = 'Hoje',
  WEEK = 'Semana',
  MONTH = 'Mês',
  QUARTER = 'Trimestre',
  YEAR = 'Ano'
}
