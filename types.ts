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
  unit: 'UN' | 'KG' | 'SC' | 'CX' | 'LT' | 'PAR';
  stock?: number;
  minStock?: number; // Novo: Estoque Mínimo para alerta
  trackStock?: boolean;
  barcode?: string | null;
}

// Interface isolada para o Item da Venda (Corrige o erro do 'i')
export interface SaleItem {
  id?: string;
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
  cpf?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  credit: number;
  totalDebt: number;
  lastInteraction: string;
  oldestDebtDays?: number;
  nextPaymentDate?: string; // Novo: Promessa de pagamento (ISO Date string)
}

export type PaymentMethod = 'MONEY' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';

export interface Sale {
  id: string;
  clientId?: string;
  clientName?: string;
  type: SaleType;
  items: SaleItem[];
  subtotal: number;
  discountOrAdjustment: number;
  finalTotal: number;
  remainingBalance: number;
  timestamp: string;
  status: 'PAID' | 'PENDING' | 'PARTIAL';
  isDelivery?: boolean; // Novo
  deliveryAddress?: string; // Novo
  deliveryStatus?: 'PENDING' | 'DELIVERED' | 'CANCELED';
  deliveryDate?: string; // Data da entrega realizada
  preferredDeliveryDate?: string; // Data/Hora preferencial ou limite
  paymentMethod?: PaymentMethod; // Novo
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
  type: 'FIXED' | 'VARIABLE' | 'CARD_FEE';
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