import { supabase } from '../lib/supabase';
// Certifique-se que types.ts está na pasta correta
import { Client, Product, Sale, PaymentRecord, Expense, SaleItem } from '../types';

export class DatabaseService {

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) return [];
    return data.map((c: any) => ({ ...c, totalDebt: c.total_debt, lastInteraction: c.last_interaction }));
  }

  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) return null;
    return { ...data, totalDebt: data.total_debt, lastInteraction: data.last_interaction };
  }

  // --- Products ---

  // Lista TODOS (para a tela de produtos e nova venda)
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) return [];

    return data.map((p: any) => ({
      ...p,
      department: p.department || 'Outros',
      subCategory: p.sub_category,
      animalType: p.animal_type,
      trackStock: p.track_stock
    }));
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
    const { id, ...prodData } = product as any;
    const { data, error } = await supabase.from('products').insert({
      name: prodData.name,
      department: prodData.department,
      sub_category: prodData.subCategory,
      animal_type: prodData.animalType,
      price: prodData.price,
      cost: prodData.cost,
      unit: prodData.unit,
      track_stock: prodData.trackStock
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
      track_stock: prodData.trackStock
    }).eq('id', id).select().single();

    if (error) throw error;
    return data;
  }

  // Função para deletar produtos (Para limpar os exemplos)
  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Sales & Payments ---
  async getSales(): Promise<Sale[]> {
    const { data, error } = await supabase.from('sales').select('*, items:sale_items(*)').order('timestamp', { ascending: false });
    if (error) return [];
    return data.map((s: any) => ({
      id: s.id, clientId: s.client_id, clientName: s.client_name, type: s.type,
      subtotal: s.subtotal, discountOrAdjustment: s.discount_or_adjustment,
      finalTotal: s.final_total, remainingBalance: s.remaining_balance,
      timestamp: s.timestamp, status: s.status,
      items: s.items.map((i: any) => ({
        id: i.id, productId: i.product_id, productName: i.product_name,
        quantity: i.quantity, unitPrice: i.unit_price, total: i.total
      }))
    }));
  }

  async getClientSales(clientId: string): Promise<Sale[]> {
    const { data, error } = await supabase.from('sales').select('*, items:sale_items(*)').eq('client_id', clientId).order('timestamp', { ascending: false });
    if (error) return [];
    return data.map((s: any) => ({
      id: s.id, clientId: s.client_id, clientName: s.client_name, type: s.type,
      subtotal: s.subtotal, discountOrAdjustment: s.discount_or_adjustment,
      finalTotal: s.final_total, remainingBalance: s.remaining_balance,
      timestamp: s.timestamp, status: s.status,
      items: s.items.map((i: any) => ({
        id: i.id, productId: i.product_id, productName: i.product_name,
        quantity: i.quantity, unitPrice: i.unit_price, total: i.total
      }))
    }));
  }

  async createSale(sale: Partial<Sale>): Promise<Sale> {
    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
      client_id: sale.clientId, client_name: sale.clientName, type: sale.type,
      subtotal: sale.subtotal, discount_or_adjustment: sale.discountOrAdjustment,
      final_total: sale.finalTotal, remaining_balance: sale.remainingBalance,
      status: sale.status, timestamp: new Date().toISOString()
    }).select().single();
    if (saleError) throw saleError;
    const saleId = saleData.id;

    if (sale.items && sale.items.length > 0) {
      const itemsToInsert = sale.items.map((i: SaleItem) => ({
        sale_id: saleId, product_id: i.productId, product_name: i.productName,
        quantity: i.quantity, unit_price: i.unitPrice, total: i.total
      }));
      await supabase.from('sale_items').insert(itemsToInsert);
    }

    if (sale.type === 'CREDIT' && sale.clientId) {
      const client = await this.getClient(sale.clientId);
      if (client) {
        let debtToAdd = sale.remainingBalance || 0;
        const newTotalDebt = client.totalDebt + debtToAdd;
        await supabase.from('clients').update({ total_debt: newTotalDebt, last_interaction: new Date().toISOString() }).eq('id', sale.clientId);
      }
    }
    return { ...sale, id: saleId } as Sale;
  }

  async updateSale(saleId: string, updatedItems: any[], newDiscountOrAdjustment?: number): Promise<void> {
    const { data: oldSaleRaw } = await supabase.from('sales').select('*').eq('id', saleId).single();
    if (!oldSaleRaw) throw new Error("Venda não encontrada");

    const newSubtotal = updatedItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);

    // Use the new discount if provided, otherwise keep the old one
    const discountToUse = newDiscountOrAdjustment !== undefined ? newDiscountOrAdjustment : (oldSaleRaw.discount_or_adjustment || 0);

    const newFinalTotal = newSubtotal + discountToUse;
    const diff = newFinalTotal - oldSaleRaw.final_total;

    await supabase.from('sale_items').delete().eq('sale_id', saleId);
    const itemsToInsert = updatedItems.map(i => ({
      sale_id: saleId, product_id: i.productId, product_name: i.productName,
      quantity: i.quantity, unit_price: i.unitPrice, total: i.quantity * i.unitPrice
    }));
    await supabase.from('sale_items').insert(itemsToInsert);

    if (oldSaleRaw.type === 'CREDIT') {
      let newRemaining = oldSaleRaw.remaining_balance + diff;

      // If payment was already made, we shouldn't increase remaining balance blindly if it was fully paid? 
      // Actually, if I edit a sale that was PARTIAL, the logic holds. 
      // If it was PAID, remaining is 0. If I increase price (diff > 0), remaining becomes > 0. Correct.
      // If I decrease price (diff < 0), remaining decreases.

      let creditToGive = 0;
      if (newRemaining < 0) {
        creditToGive = Math.abs(newRemaining);
        newRemaining = 0;
      }

      const newStatus = newRemaining <= 0.01 ? 'PAID' : 'PARTIAL'; // PARTIAL is safer than PENDING for edited sales

      await supabase.from('sales').update({
        subtotal: newSubtotal,
        discount_or_adjustment: discountToUse,
        final_total: newFinalTotal,
        remaining_balance: newRemaining,
        status: newStatus
      }).eq('id', saleId);

      const client = await this.getClient(oldSaleRaw.client_id);
      if (client) {
        if (creditToGive > 0) {
          await supabase.from('clients').update({ credit: client.credit + creditToGive }).eq('id', client.id);
        }
        // Recalculate total debt from scratch to be safe
        const freshSales = await this.getClientSales(client.id);
        const realTotalDebt = freshSales.reduce((acc, s) => acc + s.remainingBalance, 0);
        await supabase.from('clients').update({ total_debt: realTotalDebt }).eq('id', client.id);
      }
    } else {
      // CASH SALE
      // Just update values. Status remains PAID (usually).
      await supabase.from('sales').update({
        subtotal: newSubtotal,
        discount_or_adjustment: discountToUse,
        final_total: newFinalTotal
      }).eq('id', saleId);
    }
  }

  async deleteSale(saleId: string): Promise<void> {
    // 1. Get Sale Info before deleting
    const { data: sale } = await supabase.from('sales').select('*').eq('id', saleId).single();
    if (!sale) return;

    // 2. Delete Items First
    await supabase.from('sale_items').delete().eq('sale_id', saleId);

    // 3. Delete the Sale
    await supabase.from('sales').delete().eq('id', saleId);

    // 4. Update Client Debt if it was a Credit Sale
    // We assume that if a sale is deleted, it's like it never happened.
    // So we just recalculate the total debt from the remaining sales.
    if (sale.type === 'CREDIT' && sale.client_id) {
      const freshSales = await this.getClientSales(sale.client_id);
      const realTotalDebt = freshSales.reduce((acc, s) => acc + s.remainingBalance, 0);
      await supabase.from('clients').update({ total_debt: realTotalDebt }).eq('id', sale.client_id);
    }
  }

  async processPaymentFIFO(clientId: string, amount: number): Promise<void> {
    await supabase.from('payment_records').insert({ client_id: clientId, amount: amount, timestamp: new Date().toISOString(), used_credit: false });
    const sales = await this.getClientSales(clientId);
    const pendingSales = sales.filter(s => s.remainingBalance > 0).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let remainingPayment = amount;

    for (const sale of pendingSales) {
      if (remainingPayment <= 0) break;
      const debt = sale.remainingBalance;
      const paymentForThisSale = Math.min(debt, remainingPayment);
      const newRemaining = debt - paymentForThisSale;
      const newStatus = newRemaining <= 0.01 ? 'PAID' : 'PARTIAL';
      await supabase.from('sales').update({ remaining_balance: newRemaining, status: newStatus }).eq('id', sale.id);
      remainingPayment -= paymentForThisSale;
    }
    const freshSales = await this.getClientSales(clientId);
    const newTotalDebt = freshSales.reduce((acc, s) => acc + s.remainingBalance, 0);
    const currentClient = await this.getClient(clientId);
    const newCredit = (currentClient?.credit || 0) + remainingPayment;
    await supabase.from('clients').update({ total_debt: newTotalDebt, credit: newCredit, last_interaction: new Date().toISOString() }).eq('id', clientId);
  }

  async payOneSale(saleId: string): Promise<void> {
    const { data: sale } = await supabase.from('sales').select('*').eq('id', saleId).single();
    if (!sale || sale.status === 'PAID') return;
    const amountToPay = sale.remaining_balance;
    if (amountToPay <= 0) return;

    await supabase.from('sales').update({ status: 'PAID', remaining_balance: 0 }).eq('id', saleId);
    await supabase.from('payment_records').insert({ client_id: sale.client_id, amount: amountToPay, timestamp: new Date().toISOString(), used_credit: false });
    const client = await this.getClient(sale.client_id);
    if (client) {
      const newDebt = Math.max(0, client.totalDebt - amountToPay);
      await supabase.from('clients').update({ total_debt: newDebt, last_interaction: new Date().toISOString() }).eq('id', sale.client_id);
    }
  }

  async getClientPayments(clientId: string): Promise<PaymentRecord[]> {
    const { data, error } = await supabase.from('payment_records').select('*').eq('client_id', clientId).order('timestamp', { ascending: false });
    if (error) return [];
    return data.map((p: any) => ({ id: p.id, clientId: p.client_id, amount: p.amount, timestamp: p.timestamp, usedCredit: p.used_credit }));
  }

  // Novo método para buscar TODOS os pagamentos com nome do cliente (Para o Dashboard)
  async getAllPayments(): Promise<(PaymentRecord & { clientName: string })[]> {
    // Busca pagamentos
    const { data: payments, error } = await supabase.from('payment_records').select('*').order('timestamp', { ascending: false });
    if (error) return [];

    // Busca clientes para mapear nomes (Supabase join simples seria melhor, mas mantendo padrão do código)
    const { data: clients } = await supabase.from('clients').select('id, name');
    const clientMap = new Map((clients || []).map((c: any) => [c.id, c.name]));

    return payments.map((p: any) => ({
      id: p.id,
      clientId: p.client_id,
      clientName: clientMap.get(p.client_id) || 'Cliente Desconhecido',
      amount: p.amount,
      timestamp: p.timestamp,
      usedCredit: p.used_credit
    }));
  }

  async updatePayment(paymentId: string, newAmount: number): Promise<void> {
    const { data: oldPayment } = await supabase.from('payment_records').select('*').eq('id', paymentId).single();
    if (!oldPayment) throw new Error("Pagamento não encontrado");

    const diff = newAmount - oldPayment.amount;

    // Update Payment
    await supabase.from('payment_records').update({ amount: newAmount }).eq('id', paymentId);

    // Update Client Debt/Credit
    // If I paid MORE (diff > 0), debt decreases (or credit increases)
    // If I paid LESS (diff < 0), debt increases
    // It's tricky to adjust perfectly without re-running the full FIFO logic, 
    // but typically we just adjust the client's total debt/credit balance directly for simplicity in this architecture.
    // Ideally we would re-calculate everything, but let's try a direct adjustment first.

    const client = await this.getClient(oldPayment.client_id);
    if (client) {
      // Logic:
      // The payment REDUCED debt by `amount`.
      // If `newAmount` is larger, it should reduce debt MORE (so subtract diff from debt).
      // If `newAmount` is smaller, it reduced less, so we add the difference back to debt.

      // Example: 
      // Debt was 100. Paid 50. New Debt = 50.
      // Edit Payment to 60 (diff = +10). Should have been New Debt = 40.
      // So: 50 - 10 = 40. Correct.

      // Example 2:
      // Debt was 100. Paid 50. New Debt = 50.
      // Edit Payment to 40 (diff = -10). Should have been New Debt = 60.
      // So: 50 - (-10) = 60. Correct.

      let newTotalDebt = client.totalDebt - diff;

      // If debt becomes negative, it means we have credit.
      let newCredit = client.credit;
      if (newTotalDebt < 0) {
        newCredit += Math.abs(newTotalDebt);
        newTotalDebt = 0;
      }

      // Also if we have credit, and we increase debt (reduce payment), we should consume credit first?
      // This gets complex. Simplest robust way: Recalculate from clean state using FIFO? 
      // No, that changes old closed sales history which might be confusing.
      // Let's stick to the balance adjustment.

      await supabase.from('clients').update({
        total_debt: Math.max(0, newTotalDebt),
        credit: newCredit
      }).eq('id', client.id);
    }
  }

  async deletePayment(paymentId: string): Promise<void> {
    const { data: oldPayment } = await supabase.from('payment_records').select('*').eq('id', paymentId).single();
    if (!oldPayment) return;

    await supabase.from('payment_records').delete().eq('id', paymentId);

    // Revert effect on client
    // Payment reduced debt. Deleting it means debt comes back.
    const client = await this.getClient(oldPayment.client_id);
    if (client) {
      const newDebt = client.totalDebt + oldPayment.amount;
      await supabase.from('clients').update({ total_debt: newDebt }).eq('id', client.id);
    }
  }

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) return [];
    return data.map((e: any) => ({
      id: e.id, description: e.description, amount: e.amount, type: e.type || e.category, date: e.date
    }));
  }

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const { data, error } = await supabase.from('expenses').insert({
      description: expense.description,
      amount: expense.amount,
      type: expense.type,
      date: expense.date
    }).select().single();
    if (error) throw error;
    return { id: data.id, description: data.description, amount: data.amount, type: data.type, date: data.date };
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
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

}


export const db = new DatabaseService();