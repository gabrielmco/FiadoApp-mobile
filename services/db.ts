import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import NetInfo from '@react-native-community/netinfo';
import { CacheService } from './cache';
// Certifique-se que types.ts está na pasta correta
import { Client, Product, Sale, PaymentRecord, Expense, SaleItem } from '../types';

// Internal DB Types (snake_case mappings)
interface DBClient {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  address?: string; // or null
  neighborhood?: string; // or null
  credit: number;
  total_debt: number;
  last_interaction: string;
  next_payment_date?: string; // Novo
}

interface DBProduct {
  id: string;
  name: string;
  department?: string;
  sub_category?: string;
  animal_type?: string;
  price: number;
  cost?: number;
  unit: 'UN' | 'KG' | 'SC' | 'CX' | 'LT' | 'PAR';
  stock?: number;
  min_stock?: number; // Novo
  track_stock: boolean;
  barcode?: string | null;
}

interface DBSaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface DBPaymentRecord {
  id: string;
  client_id: string;
  amount: number;
  timestamp: string;
  used_credit: boolean;
}

interface DBExpense {
  id: string;
  description: string;
  amount: number;
  type: 'FIXED' | 'VARIABLE' | 'CARD_FEE';
  date: string;
}

interface DBSale {
  id: string;
  client_id?: string;
  client_name?: string;
  type: 'CASH' | 'CREDIT';
  subtotal: number;
  discount_or_adjustment: number;
  final_total: number;
  remaining_balance: number;
  timestamp: string;
  status: 'PAID' | 'PENDING' | 'PARTIAL';
  is_delivery?: boolean;
  delivery_address?: string;
  delivery_status?: 'PENDING' | 'DELIVERED' | 'CANCELED';
  delivery_date?: string;
  preferred_delivery_date?: string;
  payment_method?: 'MONEY' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
  items?: DBSaleItem[];
  // Supabase returns joined items likely as `sale_items` if not renamed, but typical code here does `items:sale_items`
}

export class DatabaseService {
  /**
   * Helper: Get current authenticated user ID
   * Required for RLS - all inserts must include user_id
   */
  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    return user.id;
  }

  async signOut(): Promise<void> {
    await CacheService.clearAllUserData();
    await supabase.auth.signOut();
  }

  // --- Alerts ---
  async checkAlerts(): Promise<{ stockAlerts: Product[], debtAlerts: Client[] }> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return (await CacheService.get<{ stockAlerts: Product[], debtAlerts: Client[] }>('alerts')) || { stockAlerts: [], debtAlerts: [] };
    }

    // 1. Check Low Stock
    const { data: products } = await supabase.from('products').select('*').eq('track_stock', true);
    const stockAlertsList: Product[] = [];

    if (products) {
      (products as unknown as DBProduct[]).forEach(p => {
        const min = p.min_stock ?? 5; // Default 5
        if ((p.stock || 0) <= min) {
          stockAlertsList.push({
            id: p.id,
            name: p.name,
            price: p.price,
            unit: p.unit,
            stock: p.stock,
            minStock: min,
            trackStock: p.track_stock
          });
        }
      });
    }

    // 2. Check Debts Due (Next Payment Date <= Today)
    const today = new Date().toISOString().split('T')[0];
    const { data: clients } = await supabase.from('clients')
      .select('*')
      .gt('total_debt', 0)
      .lte('next_payment_date', today);

    const debtAlertsList: Client[] = [];
    if (clients) {
      (clients as unknown as DBClient[]).forEach(c => {
        debtAlertsList.push({
          id: c.id,
          name: c.name,
          totalDebt: c.total_debt,
          nextPaymentDate: c.next_payment_date,
          phone: c.phone,
          credit: c.credit, // Required by interface
          lastInteraction: c.last_interaction, // Required
        });
      });
    }

    const result = { stockAlerts: stockAlertsList, debtAlerts: debtAlertsList };
    await CacheService.set('alerts', result);
    return result;
  }

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return (await CacheService.get<Client[]>('clients')) || [];
    }

    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) {
      console.error("Error fetching clients:", error);
      return (await CacheService.get<Client[]>('clients')) || [];
    }

    // Explicit mapping to avoid leaking snake_case properties or 'any' usage
    const mapped = (data as unknown as DBClient[]).map((c) => ({
      id: c.id,
      name: c.name,
      cpf: c.cpf,
      phone: c.phone,
      address: c.address,
      neighborhood: c.neighborhood,
      credit: c.credit,
      totalDebt: c.total_debt,
      lastInteraction: c.last_interaction,
      nextPaymentDate: c.next_payment_date
    }));

    await CacheService.set('clients', mapped);
    return mapped;
  }

  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) {
      console.error(`Error fetching client ${id}:`, error);
      return null;
    }
    const c = data as unknown as DBClient;
    return {
      id: c.id,
      name: c.name,
      cpf: c.cpf,
      phone: c.phone,
      address: c.address,
      neighborhood: c.neighborhood,
      credit: c.credit,
      totalDebt: c.total_debt,
      lastInteraction: c.last_interaction,
      nextPaymentDate: c.next_payment_date
    };
  }

  async addClient(client: Omit<Client, 'id' | 'totalDebt' | 'lastInteraction'>): Promise<Client> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await supabase.from('clients').insert({
      user_id: userId,
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      credit: client.credit,
      address: client.address,
      neighborhood: client.neighborhood,
      total_debt: 0,
      last_interaction: new Date().toISOString(),
      next_payment_date: client.nextPaymentDate
    }).select().single();

    if (error) throw error;
    const c = data as unknown as DBClient;
    return {
      id: c.id,
      name: c.name,
      cpf: c.cpf,
      phone: c.phone,
      address: c.address,
      neighborhood: c.neighborhood,
      credit: c.credit,
      totalDebt: c.total_debt,
      lastInteraction: c.last_interaction,
      nextPaymentDate: c.next_payment_date
    };
  }

  async updateClient(client: Partial<Client>): Promise<void> {
    if (!client.id) throw new Error("ID do cliente necessário para atualização");
    const { error } = await supabase.from('clients').update({
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      credit: client.credit,
      address: client.address,
      neighborhood: client.neighborhood,
      next_payment_date: client.nextPaymentDate
    }).eq('id', client.id);

    if (error) throw error;
  }

  // --- Products ---

  // Lista com PAGINAÇÃO e BUSCA (para a tela de produtos)
  async getProducts(page: number = 0, pageSize: number = 20, searchTerm: string = ''): Promise<Product[]> {
    const netInfo = await NetInfo.fetch();
    const cacheKey = `products_${page}_${pageSize}_${searchTerm}`;

    if (!netInfo.isConnected) {
      // Try precise cache, then fallback to default page 0 cache if available (better than nothing)
      return (await CacheService.get<Product[]>(cacheKey)) || (page === 0 ? [] : (await CacheService.get<Product[]>('products_0_20_') || []));
    }

    let query = supabase.from('products').select('*').order('name');

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Applying range for pagination
    query = query.range(from, to);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching products:", error);
      return (await CacheService.get<Product[]>(cacheKey)) || [];
    }

    const mapped = (data as unknown as DBProduct[]).map((p) => ({
      id: p.id,
      name: p.name,
      department: p.department || 'Outros',
      subCategory: p.sub_category,
      animalType: p.animal_type,
      price: p.price,
      cost: p.cost,
      unit: p.unit,
      stock: p.stock,
      minStock: p.min_stock,
      trackStock: p.track_stock,
      barcode: p.barcode
    }));

    await CacheService.set(cacheKey, mapped);
    return mapped;
  }

  // Busca UM (Para a tela de edição)
  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) return null;
    return {
      ...data,
      department: data.department,
      subCategory: data.sub_category,
      animalType: data.animal_type,
      trackStock: data.track_stock
    };
  }

  async addProduct(product: Partial<Product>): Promise<Product> {
    const userId = await this.getCurrentUserId();
    const { id, ...prodData } = product as any;
    const { data, error } = await supabase.from('products').insert({
      user_id: userId,
      name: prodData.name,
      department: prodData.department,
      sub_category: prodData.subCategory,
      animal_type: prodData.animalType,
      price: prodData.price,
      cost: prodData.cost,
      unit: prodData.unit,
      track_stock: prodData.trackStock,
      min_stock: prodData.minStock,
      barcode: prodData.barcode
    }).select().single();

    if (error) throw error;
    return data;
  }

  async updateProduct(product: Partial<Product>): Promise<Product> {
    const { id, ...prodData } = product as any;
    const { data, error } = await supabase.from('products').update({
      name: prodData.name,
      department: prodData.department,
      sub_category: prodData.subCategory,
      animal_type: prodData.animalType,
      price: prodData.price,
      cost: prodData.cost,
      unit: prodData.unit,
      track_stock: prodData.trackStock,
      min_stock: prodData.minStock, // Novo
      barcode: prodData.barcode
    }).eq('id', id).select().single();

    if (error) throw error;
    return data;
  }

  async getProductByBarcode(code: string): Promise<Product | null> {
    const { data, error } = await supabase.from('products').select('*').eq('barcode', code).limit(1);
    if (error || !data || data.length === 0) return null;
    const product = data[0];
    return {
      ...product,
      department: product.department || 'Outros',
      subCategory: product.sub_category,
      animalType: product.animal_type,
      trackStock: product.track_stock,
      barcode: product.barcode
    };
  }

  // Função para deletar produtos (Para limpar os exemplos)
  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Sales & Payments ---
  async getSales(page: number = 0, pageSize: number = 20): Promise<Sale[]> {
    const netInfo = await NetInfo.fetch();
    const cacheKey = `sales_${page}_${pageSize}`;

    if (!netInfo.isConnected) {
      return (await CacheService.get<Sale[]>(cacheKey)) || (page === 0 ? (await CacheService.get<Sale[]>('sales_0_20') || []) : []);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching sales:", error);
      return (await CacheService.get<Sale[]>(cacheKey)) || [];
    }

    // Type casting the complex join result
    // Supabase returns items array inside the sale object if joined structure matches
    const salesData = data as unknown as (DBSale & { items: DBSaleItem[] })[];

    const mapped = salesData.map((s) => ({
      id: s.id,
      clientId: s.client_id,
      clientName: s.client_name,
      type: s.type,
      subtotal: s.subtotal,
      discountOrAdjustment: s.discount_or_adjustment,
      finalTotal: s.final_total,
      remainingBalance: s.remaining_balance,
      timestamp: s.timestamp,
      status: s.status,
      isDelivery: s.is_delivery,
      deliveryAddress: s.delivery_address,
      deliveryStatus: s.delivery_status,
      deliveryDate: s.delivery_date,
      preferredDeliveryDate: s.preferred_delivery_date,
      paymentMethod: s.payment_method,
      items: (s.items || []).map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        total: i.total
      }))
    }));

    await CacheService.set(cacheKey, mapped);
    return mapped;
  }

  async updateDeliveryStatus(saleId: string, status: 'PENDING' | 'DELIVERED' | 'CANCELED'): Promise<void> {
    const updateData: any = { delivery_status: status };
    if (status === 'DELIVERED') {
      updateData.delivery_date = new Date().toISOString();
    }
    const { error } = await supabase.from('sales').update(updateData).eq('id', saleId);
    if (error) throw error;
  }

  async updateSaleDelivery(saleId: string, address: string, preferredDate?: string): Promise<void> {
    const updateData: any = { delivery_address: address };
    if (preferredDate !== undefined) {
      updateData.preferred_delivery_date = preferredDate;
    }
    const { error } = await supabase.from('sales').update(updateData).eq('id', saleId);
    if (error) throw error;
  }

  async getClientSales(clientId: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error(`Error fetching sales for client ${clientId}:`, error);
      return [];
    }

    const salesData = data as unknown as (DBSale & { items: DBSaleItem[] })[];

    return salesData.map((s) => ({
      id: s.id,
      clientId: s.client_id,
      clientName: s.client_name,
      type: s.type,
      subtotal: s.subtotal,
      discountOrAdjustment: s.discount_or_adjustment,
      finalTotal: s.final_total,
      remainingBalance: s.remaining_balance,
      timestamp: s.timestamp,
      status: s.status,
      // Mapping optional fields as well to be complete
      isDelivery: s.is_delivery,
      deliveryAddress: s.delivery_address,
      deliveryStatus: s.delivery_status,
      deliveryDate: s.delivery_date,
      preferredDeliveryDate: s.preferred_delivery_date,
      paymentMethod: s.payment_method,
      items: (s.items || []).map((i: DBSaleItem) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        total: i.total
      }))
    }));
  }

  async createSale(sale: Partial<Sale>): Promise<Sale> {
    const userId = await this.getCurrentUserId();
    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
      user_id: userId,
      client_id: sale.clientId,
      client_name: sale.clientName,
      type: sale.type,
      subtotal: sale.subtotal,
      discount_or_adjustment: sale.discountOrAdjustment,
      final_total: sale.finalTotal,
      remaining_balance: sale.remainingBalance,
      status: sale.status,
      timestamp: new Date().toISOString(),
      is_delivery: sale.isDelivery,
      delivery_address: sale.deliveryAddress,
      delivery_status: sale.deliveryStatus,
      preferred_delivery_date: sale.preferredDeliveryDate,
      payment_method: sale.paymentMethod
    }).select().single();

    if (saleError) {
      console.error("Supabase Create Sale Error:", JSON.stringify(saleError, null, 2));
      throw new Error(`Erro ao criar venda: ${saleError.message}`);
    }

    // Safe cast
    const createdSale = saleData as unknown as DBSale;
    const saleId = createdSale.id;

    if (sale.items && sale.items.length > 0) {
      const itemsToInsert = sale.items.map((i: SaleItem) => ({
        user_id: userId,
        sale_id: saleId,
        product_id: i.productId,
        product_name: i.productName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.total
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
      if (itemsError) {
        // Critical: Sale created but items failed. 
        // Ideally we should delete the sale here to avoid zombie record.
        // But strict error handling implies we notify.
        console.error("Error inserting sale items:", itemsError);
        // Attempt rollback?
        await supabase.from('sales').delete().eq('id', saleId);
        throw new Error("Erro ao salvar itens da venda. Venda cancelada.");
      }

      // --- STOCK UPDATE LOGIC ---
      for (const item of sale.items) {
        const product = await this.getProduct(item.productId);
        if (product && product.trackStock && product.stock !== undefined) {
          const newStock = product.stock - item.quantity;
          await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
        }
      }
    }

    if (sale.type === 'CREDIT' && sale.clientId) {
      const client = await this.getClient(sale.clientId);
      if (client) {
        let debtToAdd = sale.remainingBalance || 0;
        const newTotalDebt = client.totalDebt + debtToAdd;
        await supabase.from('clients').update({ total_debt: newTotalDebt, last_interaction: new Date().toISOString() }).eq('id', sale.clientId);
      }
    }

    // --- Automatic Card Fee Expense ---
    if (sale.paymentMethod === 'CREDIT_CARD' || sale.paymentMethod === 'DEBIT_CARD') {
      const feePercentage = 0.02; // 2%
      const feeAmount = (sale.finalTotal || 0) * feePercentage;

      if (feeAmount > 0) {
        await this.addExpense({
          description: `Taxa Maquininha - Venda #${saleId.slice(0, 8)}`,
          amount: parseFloat(feeAmount.toFixed(2)),
          type: 'CARD_FEE',
          date: new Date().toISOString()
        });
      }
    }

    return { ...sale, id: saleId } as Sale;
  }

  async updateSale(saleId: string, updatedItems: { productId: string; productName: string; quantity: number; unitPrice: number; }[], newDiscountOrAdjustment?: number): Promise<void> {
    const { data: oldSaleRaw, error: fetchError } = await supabase.from('sales').select('*').eq('id', saleId).single();
    if (fetchError || !oldSaleRaw) throw new Error("Venda não encontrada");

    // Explicit Cast
    const oldSale = oldSaleRaw as unknown as DBSale;

    const newSubtotal = updatedItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);

    // Use the new discount if provided, otherwise keep the old one
    const discountToUse = newDiscountOrAdjustment !== undefined ? newDiscountOrAdjustment : (oldSale.discount_or_adjustment || 0);

    const newFinalTotal = newSubtotal + discountToUse;
    const diff = newFinalTotal - oldSale.final_total;

    // --- STOCK REVERT (OLD ITEMS) ---
    // Fetch old items to know what to revert
    const { data: oldItems } = await supabase.from('sale_items').select('*').eq('sale_id', saleId);
    if (oldItems) {
      for (const item of oldItems as unknown as DBSaleItem[]) {
        const product = await this.getProduct(item.product_id);
        if (product && product.trackStock && product.stock !== undefined) {
          const restoredStock = product.stock + item.quantity;
          await supabase.from('products').update({ stock: restoredStock }).eq('id', item.product_id);
        }
      }
    }

    // TODO: Ideally wrap in a transaction (RPC)
    await supabase.from('sale_items').delete().eq('sale_id', saleId);

    const itemsToInsert = updatedItems.map(i => ({
      sale_id: saleId,
      product_id: i.productId,
      product_name: i.productName,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      total: i.quantity * i.unitPrice
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
    if (itemsError) throw new Error(`Erro ao atualizar itens: ${itemsError.message}`);

    // --- STOCK DECREMENT (NEW ITEMS) ---
    for (const item of updatedItems) {
      const product = await this.getProduct(item.productId);
      if (product && product.trackStock && product.stock !== undefined) {
        const newStock = product.stock - item.quantity;
        await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
      }
    }

    if (oldSale.type === 'CREDIT') {
      let newRemaining = oldSale.remaining_balance + diff;

      // Logic check
      let creditToGive = 0;
      if (newRemaining < 0) {
        creditToGive = Math.abs(newRemaining);
        newRemaining = 0;
      }

      const newStatus = newRemaining <= 0.01 ? 'PAID' : 'PARTIAL';

      await supabase.from('sales').update({
        subtotal: newSubtotal,
        discount_or_adjustment: discountToUse,
        final_total: newFinalTotal,
        remaining_balance: newRemaining,
        status: newStatus
      }).eq('id', saleId);

      const client = await this.getClient(oldSale.client_id!);
      if (client) {
        if (creditToGive > 0) {
          await supabase.from('clients').update({ credit: client.credit + creditToGive }).eq('id', client.id);
        }
        // Recalculate total debt is safest
        const freshSales = await this.getClientSales(client.id);
        const realTotalDebt = freshSales.reduce((acc, s) => acc + s.remainingBalance, 0);
        await supabase.from('clients').update({ total_debt: realTotalDebt }).eq('id', client.id);
      }
    } else {
      // CASH SALE
      await supabase.from('sales').update({
        subtotal: newSubtotal,
        discount_or_adjustment: discountToUse,
        final_total: newFinalTotal
      }).eq('id', saleId);
    }
  }

  async deleteSale(saleId: string): Promise<void> {
    const { data: saleRaw } = await supabase.from('sales').select('*').eq('id', saleId).single();
    if (!saleRaw) return;
    const sale = saleRaw as unknown as DBSale;

    // --- STOCK RESTORE ---
    const { data: saleItems } = await supabase.from('sale_items').select('*').eq('sale_id', saleId);
    if (saleItems) {
      for (const item of saleItems as unknown as DBSaleItem[]) {
        const product = await this.getProduct(item.product_id);
        if (product && product.trackStock && product.stock !== undefined) {
          const restoredStock = product.stock + item.quantity;
          await supabase.from('products').update({ stock: restoredStock }).eq('id', item.product_id);
        }
      }
    }

    await supabase.from('sale_items').delete().eq('sale_id', saleId);
    await supabase.from('sales').delete().eq('id', saleId);

    if (sale.type === 'CREDIT' && sale.client_id) {
      const freshSales = await this.getClientSales(sale.client_id);
      const realTotalDebt = freshSales.reduce((acc, s) => acc + s.remainingBalance, 0);
      await supabase.from('clients').update({ total_debt: realTotalDebt }).eq('id', sale.client_id);
    }
  }

  // ⚠️ CRITICAL WARNING: This runs in a loop locally. Not atomic. 
  // Should be moved to a Postgres Function (RPC) for production safety.
  async processPaymentFIFO(clientId: string, amount: number): Promise<void> {
    const userId = await this.getCurrentUserId();
    const { error: payError } = await supabase.from('payment_records').insert({
      user_id: userId,
      client_id: clientId,
      amount: amount,
      timestamp: new Date().toISOString(),
      used_credit: false
    });

    if (payError) throw new Error(`Erro ao registrar pagamento: ${payError.message}`);

    const sales = await this.getClientSales(clientId);
    // Sort oldest first
    const pendingSales = sales
      .filter(s => s.remainingBalance > 0.01) // Filter small rounding errors
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let remainingPayment = amount;

    for (const sale of pendingSales) {
      if (remainingPayment <= 0) break;
      const debt = sale.remainingBalance;
      const paymentForThisSale = Math.min(debt, remainingPayment);
      const newRemaining = debt - paymentForThisSale;
      const newStatus = newRemaining <= 0.01 ? 'PAID' : 'PARTIAL';

      const { error } = await supabase.from('sales').update({
        remaining_balance: newRemaining,
        status: newStatus
      }).eq('id', sale.id);

      if (error) {
        console.error(`Failed to update sale ${sale.id} during FIFO payment. Database might be inconsistent.`);
        // Continue to try updating others? Or stop? 
        // Stop is safer to avoid consuming payment without updating.
        throw new Error("Erro crítico ao processar baixa de vendas. Verifique o saldo.");
      }

      remainingPayment -= paymentForThisSale;
    }

    const freshSales = await this.getClientSales(clientId);
    const newTotalDebt = freshSales.reduce((acc, s) => acc + s.remainingBalance, 0);
    const currentClient = await this.getClient(clientId);
    const newCredit = (currentClient?.credit || 0) + remainingPayment;

    await supabase.from('clients').update({
      total_debt: newTotalDebt,
      credit: newCredit,
      last_interaction: new Date().toISOString()
    }).eq('id', clientId);
  }

  async payOneSale(saleId: string): Promise<void> {
    const { data: saleRaw } = await supabase.from('sales').select('*').eq('id', saleId).single();
    if (!saleRaw) return;
    const sale = saleRaw as unknown as DBSale;

    if (sale.status === 'PAID') return;
    const amountToPay = sale.remaining_balance;
    if (amountToPay <= 0) return;

    await supabase.from('sales').update({ status: 'PAID', remaining_balance: 0 }).eq('id', saleId);

    const userId = await this.getCurrentUserId();
    await supabase.from('payment_records').insert({
      user_id: userId,
      client_id: sale.client_id,
      amount: amountToPay,
      timestamp: new Date().toISOString(),
      used_credit: false
    });

    const client = await this.getClient(sale.client_id!);
    if (client) {
      const newDebt = Math.max(0, client.totalDebt - amountToPay);
      await supabase.from('clients').update({
        total_debt: newDebt,
        last_interaction: new Date().toISOString()
      }).eq('id', sale.client_id);
    }
  }

  async getClientPayments(clientId: string): Promise<PaymentRecord[]> {
    const { data, error } = await supabase.from('payment_records').select('*').eq('client_id', clientId).order('timestamp', { ascending: false });
    if (error) return [];
    // DB Payment snake_case? 
    // Usually tables are snake_case. Let's assume payment_records has client_id, used_credit.
    // The previous code used p.client_id, p.used_credit.
    return data.map((p: any) => ({
      id: p.id,
      clientId: p.client_id,
      amount: p.amount,
      timestamp: p.timestamp,
      usedCredit: p.used_credit
    }));
  }

  // Novo método para buscar TODOS os pagamentos com nome do cliente (Para o Dashboard)
  async getAllPayments(limit: number = 20): Promise<(PaymentRecord & { clientName: string })[]> {
    const netInfo = await NetInfo.fetch();
    const cacheKey = `all_payments_${limit}`;

    if (!netInfo.isConnected) {
      return (await CacheService.get<(PaymentRecord & { clientName: string })[]>(cacheKey)) || (limit === 20 ? (await CacheService.get<(PaymentRecord & { clientName: string })[]>('all_payments_20') || []) : []);
    }

    // Busca pagamentos LIMITADO para performance
    const { data: payments, error } = await supabase
      .from('payment_records')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      return (await CacheService.get<(PaymentRecord & { clientName: string })[]>(cacheKey)) || [];
    }

    // Busca clientes para mapear nomes
    // O ideal seria um join, mas para manter a simplicidade atual:
    // Otimização: buscar apenas IDs dos clientes retornados no pagamento
    const clientIds = [...new Set(payments.map((p: any) => p.client_id))];

    if (clientIds.length === 0) return [];

    const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
    const clientMap = new Map((clients || []).map((c: any) => [c.id, c.name]));

    const mapped = payments.map((p: any) => ({
      id: p.id,
      clientId: p.client_id,
      clientName: clientMap.get(p.client_id) || 'Cliente Desconhecido',
      amount: p.amount,
      timestamp: p.timestamp,
      usedCredit: p.used_credit
    }));

    await CacheService.set(cacheKey, mapped);
    return mapped;
  }



  async updatePayment(paymentId: string, newAmount: number): Promise<void> {
    const { data: oldPaymentRaw, error } = await supabase.from('payment_records').select('*').eq('id', paymentId).single();
    if (error || !oldPaymentRaw) throw new Error("Pagamento não encontrado");

    // Explicit Cast
    const oldPayment = oldPaymentRaw as unknown as DBPaymentRecord;

    const diff = newAmount - oldPayment.amount;

    await supabase.from('payment_records').update({ amount: newAmount }).eq('id', paymentId);

    const client = await this.getClient(oldPayment.client_id);
    if (client) {
      let newTotalDebt = client.totalDebt - diff;

      let newCredit = client.credit;
      if (newTotalDebt < 0) {
        newCredit += Math.abs(newTotalDebt);
        newTotalDebt = 0;
      }

      await supabase.from('clients').update({
        total_debt: Math.max(0, newTotalDebt),
        credit: newCredit
      }).eq('id', client.id);
    }
  }

  async deletePayment(paymentId: string): Promise<void> {
    const { data: oldPaymentRaw } = await supabase.from('payment_records').select('*').eq('id', paymentId).single();
    if (!oldPaymentRaw) return;
    const oldPayment = oldPaymentRaw as unknown as DBPaymentRecord;

    await supabase.from('payment_records').delete().eq('id', paymentId);

    const client = await this.getClient(oldPayment.client_id);
    if (client) {
      const newDebt = client.totalDebt + oldPayment.amount;
      await supabase.from('clients').update({ total_debt: newDebt }).eq('id', client.id);
    }
  }

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) {
      console.error("Error fetching expenses:", error);
      return [];
    }

    return (data as unknown as DBExpense[]).map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      type: e.type,
      date: e.date
    }));
  }

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await supabase.from('expenses').insert({
      user_id: userId,
      description: expense.description,
      amount: expense.amount,
      type: expense.type,
      date: expense.date
    }).select().single();

    if (error) throw error;

    const e = data as unknown as DBExpense;
    return {
      id: e.id,
      description: e.description,
      amount: e.amount,
      type: e.type,
      date: e.date
    };
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Settings ---
  async getSettings(): Promise<{ [key: string]: string }> {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return {};

    const settingsMap: { [key: string]: string } = {};
    data.forEach((item: any) => {
      settingsMap[item.key] = item.value;
    });
    return settingsMap;
  }

  async saveSetting(key: string, value: string): Promise<void> {
    const { error } = await supabase.from('settings').upsert({ key, value });
    if (error) throw error;
  }

  // --- Backup & Restore ---
  async exportBackup(): Promise<string> {
    const [clients, products, sales, saleItems, expenses, payments] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('products').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('sale_items').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('payment_records').select('*')
    ]);

    const backupData = {
      clients: clients.data || [],
      products: products.data || [],
      sales: sales.data || [],
      saleItems: saleItems.data || [],
      expenses: expenses.data || [],
      payments: payments.data || [],
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(backupData);
  }

  async importBackup(jsonString: string): Promise<void> {
    const backup = JSON.parse(jsonString);
    if (!backup.version) throw new Error("Arquivo de backup inválido");

    // 1. Clear current data (Order matters due to FKs)
    await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to delete all
    await supabase.from('payment_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Insert new data (Batched if possible, but simple loops for safety here)
    if (backup.clients?.length) await supabase.from('clients').insert(backup.clients);
    if (backup.products?.length) await supabase.from('products').insert(backup.products);
    // Sales depend on Clients
    if (backup.sales?.length) await supabase.from('sales').insert(backup.sales);
    // Sale Items depend on Sales and Products
    if (backup.saleItems?.length) await supabase.from('sale_items').insert(backup.saleItems);
    if (backup.expenses?.length) await supabase.from('expenses').insert(backup.expenses);
    if (backup.payments?.length) await supabase.from('payment_records').insert(backup.payments);
  }

  async deleteClient(clientId: string): Promise<void> {
    // 1. Get all sales to find their IDs
    const { data: sales } = await supabase.from('sales').select('id').eq('client_id', clientId);
    const saleIds = sales?.map(s => s.id) || [];

    // 2. Delete Sale Items for those sales
    if (saleIds.length > 0) {
      await supabase.from('sale_items').delete().in('sale_id', saleIds);
    }

    // 3. Delete Sales
    if (saleIds.length > 0) {
      await supabase.from('sales').delete().in('id', saleIds);
    }

    // 4. Delete Payment Records
    await supabase.from('payment_records').delete().eq('client_id', clientId);

    // 5. Delete Client found
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
  }

  // --- CSV Import ---
  parseMoney(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove 'R$', spaces, and convert comma to dot
    const clean = value.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  async importClientsFromCSV(csvString: string): Promise<{ success: number; errors: number }> {
    return new Promise((resolve) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          let successCount = 0;
          let errorCount = 0;

          const rows = results.data as any[];
          for (const row of rows) {
            // Map PT headers to DB columns
            // Expected: nome, telefone, endereco, bairro, cpf, credito
            const clientData = {
              name: row['nome'] || row['Nome'] || '',
              phone: row['telefone'] || row['Telefone'] || null,
              address: row['endereco'] || row['Endereco'] || row['Endereço'] || null,
              neighborhood: row['bairro'] || row['Bairro'] || null,
              cpf: row['cpf'] || row['CPF'] || null,
              credit: this.parseMoney(row['credito'] || row['Credito'] || row['Crédito'] || '0')
            };

            if (!clientData.name) {
              errorCount++;
              continue;
            }

            try {
              await this.addClient(clientData);
              successCount++;
            } catch (e) {
              console.error("Error importing client:", e);
              errorCount++;
            }
          }
          resolve({ success: successCount, errors: errorCount });
        },
        error: (error: any) => {
          console.error("CSV Parse Error:", error);
          resolve({ success: 0, errors: 1 });
        }
      });
    });
  }

  async importProductsFromCSV(csvString: string): Promise<{ success: number; errors: number }> {
    return new Promise((resolve) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          let successCount = 0;
          let errorCount = 0;

          const rows = results.data as any[];
          for (const row of rows) {
            // Map PT headers: nome, preco, custo, categoria, unidade, tipo_animal
            const productData = {
              name: row['nome'] || row['Nome'] || '',
              price: this.parseMoney(row['preco'] || row['Preco'] || row['Preço'] || '0'),
              cost: this.parseMoney(row['custo'] || row['Custo'] || '0'),
              department: row['categoria'] || row['Categoria'] || row['Departamento'] || 'Outros',
              subCategory: row['subcategoria'] || row['Subcategoria'] || null,
              animalType: row['tipo_animal'] || row['Tipo Animal'] || null,
              unit: row['unidade'] || row['Unidade'] || 'UN',
              trackStock: true // Default to true for imports
            };

            if (!productData.name) {
              errorCount++;
              continue;
            }

            try {
              await this.addProduct(productData);
              successCount++;
            } catch (e) {
              console.error("Error importing product:", e);
              errorCount++;
            }
          }
          resolve({ success: successCount, errors: errorCount });
        },
        error: (error: any) => {
          console.error("CSV Parse Error:", error);
          resolve({ success: 0, errors: 1 });
        }
      });
    });
  }

  async getDashboardMetrics(start: Date, end: Date): Promise<{ revenue: number; costs: number; expenses: number; profit: number; }> {
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    // 1. Fetch Sales in Range
    const { data: salesRaw, error: salesError } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .gte('timestamp', startStr)
      .lte('timestamp', endStr);

    if (salesError) {
      console.error("Error fetching dashboard sales:", salesError);
      return { revenue: 0, costs: 0, expenses: 0, profit: 0 };
    }

    const sales = salesRaw as unknown as (DBSale & { items: DBSaleItem[] })[];

    // 2. Fetch Expenses in Range
    const { data: expensesRaw, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr);

    if (expensesError) {
      console.error("Error fetching dashboard expenses:", expensesError);
      // Continue with partial data?
    }
    const expenses = (expensesRaw as unknown as DBExpense[]) || [];

    // 3. Fetch Products for Cost Calculation (Optimization: Cache this?)
    // Converting to Map for O(1) lookup
    const { data: productsRaw } = await supabase.from('products').select('id, cost');
    const productCostMap = new Map<string, number>();
    if (productsRaw) {
      productsRaw.forEach((p: any) => {
        productCostMap.set(p.id, p.cost || 0);
      });
    }

    // 4. Calculate Metrics
    let revenue = 0;
    let productCosts = 0;

    for (const sale of sales) {
      // Revenue is based on final_total (what client pays)
      // If sale is cancelled? We should filter status != 'CANCELED' ??
      // Schema doesn't list CANCELED for sale status, only delivery_status. 
      // Assuming all sales present are valid revenue unless we have a 'CANCELED' status.
      // Status is PAID, PENDING, PARTIAL. All count as revenue (accrual basis) or only PAID (cash basis)?
      // "Faturamento" usually implies Accrual (Vendas Realizadas).

      revenue += sale.final_total;

      if (sale.items) {
        for (const item of sale.items) {
          const cost = productCostMap.get(item.product_id) || 0;
          productCosts += cost * item.quantity;
        }
      }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const totalCosts = productCosts + totalExpenses;
    const profit = revenue - totalCosts;

    return {
      revenue,
      costs: productCosts, // Only product costs
      expenses: totalExpenses, // Separated expenses
      profit
    };
  }

}

export const db = new DatabaseService();