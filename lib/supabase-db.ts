import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import * as localDb from './db';

// Helper to format clean date (null if empty string)
function cleanDate(d: any): string | null {
  if (!d || String(d).trim() === '') return null;
  return String(d).split('T')[0];
}

// ============================================================================
// 1. SALES INVOICES & ITEMS
// ============================================================================

export async function getSalesInvoices(): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getSalesInvoices();

  const { data, error } = await supabaseAdmin
    .from('sales_invoices')
    .select(`
      *,
      customers (
        name,
        phone,
        address,
        gstin,
        state
      )
    `)
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase getSalesInvoices error, falling back to localDb:', error.message);
    return localDb.getSalesInvoices();
  }

  return (data || []).map((row: any) => ({
    ...row,
    customer_name: row.customers?.name || '',
    customer_phone: row.customers?.phone || '',
    customer_address: row.customers?.address || '',
    customer_gstin: row.customers?.gstin || '',
    customer_state: row.customers?.state || '',
  }));
}

export async function getSalesInvoiceById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured()) return localDb.getSalesInvoiceById(id);

  const { data: invoice, error } = await supabaseAdmin
    .from('sales_invoices')
    .select(`
      *,
      customers (
        name,
        phone,
        address,
        gstin,
        state
      ),
      sales_invoice_items (*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return localDb.getSalesInvoiceById(id);
  }

  // Fetch payments for this invoice
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('payment_date', { ascending: false });

  return {
    ...invoice,
    customer_name: invoice.customers?.name || '',
    customer_phone: invoice.customers?.phone || '',
    customer_address: invoice.customers?.address || '',
    customer_gstin: invoice.customers?.gstin || '',
    customer_state: invoice.customers?.state || '',
    items: invoice.sales_invoice_items || [],
    payments: payments || [],
    ewayBills: [],
  };
}

export async function getNextInvoiceNumber(): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabaseAdmin
        .from('sales_invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(50);

      let maxNum = 0;
      if (data && data.length > 0) {
        for (const row of data) {
          const match = String(row.invoice_number || '').match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }

      const { data: bs } = await supabaseAdmin
        .from('business_settings')
        .select('invoice_prefix')
        .limit(1)
        .single();

      const prefix = bs?.invoice_prefix || 'SI-';
      const nextNum = Math.max(maxNum + 1, 1);
      return `${prefix}${String(nextNum).padStart(3, '0')}`;
    } catch (e) {
      // fallback
    }
  }
  return localDb.getNextInvoiceNumber();
}

export async function createSalesInvoice(data: any): Promise<any> {
  const id = data.id || ('inv_' + Date.now());
  const invoiceNumber = data.invoice_number ? String(data.invoice_number).trim() : await getNextInvoiceNumber();

  const grandTotal = Number(data.grand_total ?? data.total_amount ?? 0);
  const paidAmount = Number(data.paid_amount || 0);
  const balanceAmount = Math.max(0, grandTotal - paidAmount);
  const paymentStatus = balanceAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  if (isSupabaseConfigured()) {
    // 1. Insert Sales Invoice
    const invoicePayload = {
      id,
      business_id: 'biz_al_ameen_01',
      invoice_number: invoiceNumber,
      quotation_id: data.quotation_id || null,
      customer_id: data.customer_id,
      invoice_type: data.invoice_type || 'tax_invoice',
      issue_date: cleanDate(data.issue_date) || new Date().toISOString().split('T')[0],
      due_date: cleanDate(data.due_date),
      site_address: data.site_address || '',
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount ?? data.discount_amount ?? 0),
      taxable_amount: Number(data.taxable_amount || 0),
      is_interstate: Boolean(data.is_interstate),
      cgst: Number(data.cgst ?? data.cgst_amount ?? 0),
      sgst: Number(data.sgst ?? data.sgst_amount ?? 0),
      igst: Number(data.igst ?? data.igst_amount ?? 0),
      total_tax: Number(data.total_tax ?? data.totalTax ?? 0),
      installation_charges: Number(data.installation_charges || 0),
      transport_charges: Number(data.transport_charges || 0),
      other_charges: Number(data.other_charges || 0),
      grand_total: grandTotal,
      paid_amount: paidAmount,
      balance_amount: balanceAmount,
      payment_status: paymentStatus,
      terms: data.terms || '',
      notes: data.notes || '',
      created_by_user_id: data.created_by_user_id || null,
      created_by_name: data.created_by_name || null,
    };

    const { error: invErr } = await supabaseAdmin.from('sales_invoices').insert(invoicePayload);
    if (invErr) {
      console.error('Failed to create sales_invoices in Supabase:', invErr);
      throw new Error(`Failed to create invoice in database: ${invErr.message}`);
    }

    // 2. Insert Items
    if (Array.isArray(data.items) && data.items.length > 0) {
      const itemsPayload = data.items.map((item: any, idx: number) => ({
        id: `sitem_${id}_${idx}`,
        invoice_id: id,
        product_id: item.product_id || null,
        item_type: item.item_type || (item.product_id ? 'product' : 'shutter'),
        description: item.description || 'Item',
        hsn_code: item.hsn_code || (item.item_type === 'service' ? '998719' : (item.item_type === 'product' ? '8501' : '7308')),
        width: Number(item.width || 0),
        height: Number(item.height || 0),
        measurement_unit: item.measurement_unit || (item.item_type === 'service' ? (item.unit || 'Job') : (item.item_type === 'product' ? (item.unit || 'Nos') : 'Feet')),
        width_ft: Number(item.width_ft || 0),
        height_ft: Number(item.height_ft || 0),
        area_sqft: Number(item.area_sqft || 0),
        rate_per_sqft: Number(item.rate_per_sqft || 0),
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        material_charges: Number(item.material_charges || 0),
        motor_charges: Number(item.motor_charges || 0),
        spring_charges: Number(item.spring_charges || 0),
        gearbox_charges: Number(item.gearbox_charges || 0),
        installation_charges: Number(item.installation_charges || 0),
        discount: Number(item.discount || 0),
        taxable_amount: Number(item.taxable_amount || 0),
        gst_rate: Number(item.gst_rate || 18),
        cgst_amount: Number(item.cgst_amount || 0),
        sgst_amount: Number(item.sgst_amount || 0),
        igst_amount: Number(item.igst_amount || 0),
        total_amount: Number(item.total_amount || 0),
      }));

      const { error: itemsErr } = await supabaseAdmin.from('sales_invoice_items').insert(itemsPayload);
      if (itemsErr) {
        console.error('Failed to create sales_invoice_items in Supabase:', itemsErr);
      }

      // Deduct inventory in Supabase
      for (const item of data.items) {
        if (item.product_id && item.item_type !== 'service') {
          const qty = Number(item.quantity) || 1;
          const { data: prod } = await supabaseAdmin.from('products').select('current_stock, track_stock').eq('id', item.product_id).single();
          if (prod && prod.track_stock) {
            const newStock = Math.max(0, Number(prod.current_stock || 0) - qty);
            await supabaseAdmin.from('products').update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq('id', item.product_id);
            await supabaseAdmin.from('stock_movements').insert({
              id: `sm_inv_${id}_${Math.random().toString(36).substring(2, 7)}`,
              business_id: 'biz_al_ameen_01',
              product_id: item.product_id,
              type: 'out',
              quantity: qty,
              reference_type: 'sales_invoice',
              reference_id: id,
              notes: `Sold via Invoice ${invoiceNumber}`,
              user_id: data.created_by_user_id || null,
              user_name: data.created_by_name || null,
            });
          }
        }
      }
    }

    // 3. Update customer current balance
    if (balanceAmount > 0) {
      const { data: cust } = await supabaseAdmin.from('customers').select('current_balance').eq('id', data.customer_id).single();
      if (cust) {
        const newBal = Number(cust.current_balance || 0) + balanceAmount;
        await supabaseAdmin.from('customers').update({ current_balance: newBal, updated_at: new Date().toISOString() }).eq('id', data.customer_id);
      }
    }

    // 4. Record advance payment if paid_amount > 0
    if (paidAmount > 0) {
      const paymentId = 'pay_' + Date.now();
      await supabaseAdmin.from('payments').insert({
        id: paymentId,
        business_id: 'biz_al_ameen_01',
        payment_number: `RCP-${Math.floor(100 + Math.random() * 900)}`,
        type: 'in',
        entity_type: 'customer',
        entity_id: data.customer_id,
        invoice_id: id,
        amount: paidAmount,
        payment_mode: data.payment_mode || 'Cash',
        reference_number: data.payment_reference || '',
        notes: 'Advance payment received against ' + invoiceNumber,
        payment_date: cleanDate(data.issue_date) || new Date().toISOString().split('T')[0],
      });
    }

    // 5. If converted from quotation, update quotation status
    if (data.quotation_id) {
      await supabaseAdmin.from('quotations').update({ status: 'converted', updated_at: new Date().toISOString() }).eq('id', data.quotation_id);
    }
  }

  // Also sync locally to SQLite if possible
  try {
    localDb.createSalesInvoice({ ...data, id, invoice_number: invoiceNumber });
  } catch (err) {
    // Non-blocking in serverless/readonly mode
  }

  return getSalesInvoiceById(id);
}

export async function deleteSalesInvoice(id: string): Promise<{ success: boolean }> {
  // 1. Fetch invoice to rollback customer balance, product stock, and quotations
  let invoice: any = null;
  if (isSupabaseConfigured()) {
    const { data: inv } = await supabaseAdmin
      .from('sales_invoices')
      .select('*, sales_invoice_items(*)')
      .eq('id', id)
      .single();
    invoice = inv;
  }

  if (!invoice) {
    try {
      invoice = localDb.getSalesInvoiceById(id);
    } catch (e) {}
  }

  if (isSupabaseConfigured() && invoice) {
    // A. Restore product stock in Supabase
    const items = invoice.sales_invoice_items || [];
    for (const item of items) {
      if (item.product_id && item.item_type !== 'service') {
        const qty = Number(item.quantity) || 1;
        const { data: prod } = await supabaseAdmin.from('products').select('current_stock').eq('id', item.product_id).single();
        if (prod) {
          const restoredStock = Number(prod.current_stock || 0) + qty;
          await supabaseAdmin.from('products').update({ current_stock: restoredStock, updated_at: new Date().toISOString() }).eq('id', item.product_id);
        }
      }
    }

    // B. Delete stock movements attached to this invoice
    await supabaseAdmin.from('stock_movements').delete().eq('reference_type', 'sales_invoice').eq('reference_id', id);

    // C. Delete payments attached to this invoice
    await supabaseAdmin.from('payments').delete().eq('invoice_id', id);

    // D. Update customer balance (subtract balance_amount)
    if (Number(invoice.balance_amount || 0) > 0) {
      const { data: cust } = await supabaseAdmin.from('customers').select('current_balance').eq('id', invoice.customer_id).single();
      if (cust) {
        const newBal = Math.max(0, Number(cust.current_balance || 0) - Number(invoice.balance_amount || 0));
        await supabaseAdmin.from('customers').update({ current_balance: newBal, updated_at: new Date().toISOString() }).eq('id', invoice.customer_id);
      }
    }

    // E. Reset quotation status if converted
    if (invoice.quotation_id) {
      await supabaseAdmin.from('quotations').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', invoice.quotation_id);
    }

    // F. Permanently delete invoice (cascades to sales_invoice_items)
    const { error: delErr } = await supabaseAdmin.from('sales_invoices').delete().eq('id', id);
    if (delErr) {
      console.error('Failed to delete sales_invoices from Supabase:', delErr);
      throw new Error(`Failed to delete invoice from database: ${delErr.message}`);
    }
  }

  // Also remove from local SQLite
  try {
    localDb.deleteSalesInvoice(id);
  } catch (err) {
    // Non-blocking in serverless/readonly mode
  }

  return { success: true };
}

// ============================================================================
// 2. PRODUCTS & INVENTORY
// ============================================================================

export async function getProducts(filter?: { categoryId?: string; type?: string; activeOnly?: boolean; search?: string }): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getProducts(filter);

  let query = supabaseAdmin
    .from('products')
    .select(`
      *,
      product_categories (
        name
      )
    `)
    .order('name', { ascending: true });

  if (filter?.categoryId) {
    query = query.eq('category_id', filter.categoryId);
  }
  if (filter?.type) {
    query = query.eq('item_type', filter.type);
  }
  if (filter?.activeOnly) {
    query = query.eq('is_active', true);
  }
  if (filter?.search) {
    query = query.ilike('name', `%${filter.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Supabase getProducts error, falling back:', error.message);
    return localDb.getProducts(filter);
  }

  return (data || []).map((p: any) => ({
    ...p,
    category_name: p.product_categories?.name || '',
  }));
}

export async function getProductById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured()) return localDb.getProductById(id);

  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      product_categories (
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return localDb.getProductById(id);
  return {
    ...data,
    category_name: data.product_categories?.name || '',
  };
}

export async function createProduct(data: any): Promise<any> {
  const id = data.id || ('prod_' + Date.now());
  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      category_id: data.category_id || null,
      name: data.name,
      sku: data.sku || null,
      hsn_code: data.hsn_code || '7308',
      brand: data.brand || null,
      item_type: data.item_type || 'product',
      unit: data.unit || 'Piece',
      purchase_price: Number(data.purchase_price || 0),
      selling_price: Number(data.selling_price || 0),
      gst_rate: Number(data.gst_rate || 18),
      opening_stock: Number(data.opening_stock || 0),
      current_stock: Number(data.current_stock ?? data.opening_stock ?? 0),
      min_stock_alert: Number(data.min_stock_alert || 5),
      track_stock: data.track_stock !== false,
      is_active: data.is_active !== false,
      is_measurement_based: Boolean(data.is_measurement_based),
      rate_per_sqft: Number(data.rate_per_sqft || 0),
      description: data.description || null,
    };

    const { error } = await supabaseAdmin.from('products').insert(payload);
    if (error) {
      console.error('Supabase createProduct error:', error);
      throw new Error(`Failed to create product in database: ${error.message}`);
    }
  }

  try {
    localDb.createProduct({ ...data, id });
  } catch (e) {}

  return getProductById(id);
}

export async function updateProduct(id: string, data: any): Promise<any> {
  if (isSupabaseConfigured()) {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    const fields = [
      'name', 'category_id', 'sku', 'hsn_code', 'brand', 'item_type',
      'unit', 'purchase_price', 'selling_price', 'gst_rate', 'current_stock',
      'min_stock_alert', 'track_stock', 'is_active', 'is_measurement_based',
      'rate_per_sqft', 'description'
    ];
    for (const f of fields) {
      if (data[f] !== undefined) updatePayload[f] = data[f];
    }
    const { error } = await supabaseAdmin.from('products').update(updatePayload).eq('id', id);
    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  try {
    localDb.updateProduct(id, data);
  } catch (e) {}

  return getProductById(id);
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured()) {
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  try {
    localDb.deleteProduct(id);
  } catch (e) {}

  return { success: true };
}

export async function adjustStock(
  productId: string,
  type: string,
  quantity: number,
  reason: string,
  userId?: string,
  userName?: string,
  userRole?: string,
  newPrice?: number
): Promise<any> {
  if (isSupabaseConfigured()) {
    const { data: prod } = await supabaseAdmin.from('products').select('*').eq('id', productId).single();
    if (!prod) throw new Error('Product not found');

    const prevStock = Number(prod.current_stock || 0);
    const addedStock = Number(quantity);
    let newStock = prevStock;

    if (type === 'in' || type === 'restock') {
      newStock = prevStock + addedStock;
    } else if (type === 'out') {
      newStock = Math.max(0, prevStock - addedStock);
    } else if (type === 'adjustment' || type === 'set') {
      newStock = addedStock;
    }

    const prodUpdates: any = { current_stock: newStock, updated_at: new Date().toISOString() };
    if (newPrice !== undefined && newPrice > 0) {
      prodUpdates.selling_price = newPrice;
    }

    await supabaseAdmin.from('products').update(prodUpdates).eq('id', productId);

    await supabaseAdmin.from('stock_movements').insert({
      id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      business_id: 'biz_al_ameen_01',
      product_id: productId,
      type: type === 'restock' ? 'in' : type,
      quantity: addedStock,
      reference_type: 'manual_adjustment',
      notes: reason,
      user_id: userId || null,
      user_name: userName || null,
      user_role: userRole || null,
      previous_stock: prevStock,
      added_stock: addedStock,
      new_stock: newStock,
      previous_price: prod.selling_price || 0,
      new_price: newPrice !== undefined ? newPrice : prod.selling_price || 0,
      reason: reason || 'Manual stock update',
    });
  }

  try {
    localDb.adjustStock(productId, Number(quantity), (type === 'restock' ? 'in' : type) as any, reason, { userId, userName, userRole, reason });
  } catch (e) {}

  return getProductById(productId);
}

export async function getCategories(): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getCategories();
  const { data, error } = await supabaseAdmin.from('product_categories').select('*').order('name');
  if (error) return localDb.getCategories();
  return data || [];
}

export async function createCategory(data: any): Promise<any> {
  const id = data.id || ('cat_' + Date.now());
  if (isSupabaseConfigured()) {
    const { error } = await supabaseAdmin.from('product_categories').insert({
      id,
      business_id: 'biz_al_ameen_01',
      name: data.name,
      description: data.description || '',
    });
    if (error) throw new Error(error.message);
  }
  try {
    localDb.createCategory({ ...data, id });
  } catch (e) {}
  return { id, name: data.name, description: data.description || '' };
}

// ============================================================================
// 3. CUSTOMERS & SUPPLIERS
// ============================================================================

export async function getCustomers(): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getCustomers();
  const { data, error } = await supabaseAdmin.from('customers').select('*').order('name');
  if (error) return localDb.getCustomers();
  return data || [];
}

export async function getCustomerById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured()) return localDb.getCustomerById(id);
  const { data, error } = await supabaseAdmin.from('customers').select('*').eq('id', id).single();
  if (error || !data) return localDb.getCustomerById(id);

  // Fetch recent invoices & payments
  const { data: invoices } = await supabaseAdmin.from('sales_invoices').select('*').eq('customer_id', id).order('issue_date', { ascending: false }).limit(20);
  const { data: payments } = await supabaseAdmin.from('payments').select('*').eq('entity_id', id).order('payment_date', { ascending: false }).limit(20);

  return {
    ...data,
    invoices: invoices || [],
    payments: payments || [],
  };
}

export async function createCustomer(data: any): Promise<any> {
  const id = data.id || ('cust_' + Date.now());
  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      name: data.name,
      phone: data.phone,
      alternate_phone: data.alternate_phone || null,
      email: data.email || null,
      address: data.address || '',
      state: data.state || 'Tamil Nadu',
      state_code: data.state_code || '33',
      gstin: data.gstin || null,
      opening_balance: Number(data.opening_balance || 0),
      current_balance: Number(data.current_balance ?? data.opening_balance ?? 0),
      notes: data.notes || null,
    };
    const { error } = await supabaseAdmin.from('customers').insert(payload);
    if (error) throw new Error(`Failed to create customer: ${error.message}`);
  }
  try {
    localDb.createCustomer({ ...data, id });
  } catch (e) {}
  return getCustomerById(id);
}

export async function updateCustomer(id: string, data: any): Promise<any> {
  if (isSupabaseConfigured()) {
    const payload: any = { updated_at: new Date().toISOString() };
    const fields = ['name', 'phone', 'alternate_phone', 'email', 'address', 'state', 'state_code', 'gstin', 'current_balance', 'notes'];
    for (const f of fields) {
      if (data[f] !== undefined) payload[f] = data[f];
    }
    const { error } = await supabaseAdmin.from('customers').update(payload).eq('id', id);
    if (error) throw new Error(`Failed to update customer: ${error.message}`);
  }
  try {
    localDb.updateCustomer(id, data);
  } catch (e) {}
  return getCustomerById(id);
}

export async function getSuppliers(): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getSuppliers();
  const { data, error } = await supabaseAdmin.from('suppliers').select('*').order('name');
  if (error) return localDb.getSuppliers();
  return data || [];
}

export async function createSupplier(data: any): Promise<any> {
  const id = data.id || ('sup_' + Date.now());
  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      name: data.name,
      contact_person: data.contact_person || null,
      phone: data.phone,
      email: data.email || null,
      address: data.address || '',
      gstin: data.gstin || null,
      balance: Number(data.balance || 0),
    };
    const { error } = await supabaseAdmin.from('suppliers').insert(payload);
    if (error) throw new Error(`Failed to create supplier: ${error.message}`);
  }
  try {
    localDb.createSupplier({ ...data, id });
  } catch (e) {}
  return { id, ...data };
}

// ============================================================================
// 4. QUOTATIONS
// ============================================================================

export async function getQuotations(): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getQuotations();
  const { data, error } = await supabaseAdmin
    .from('quotations')
    .select(`
      *,
      customers (
        name,
        phone,
        address
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return localDb.getQuotations();
  return (data || []).map((q: any) => ({
    ...q,
    customer_name: q.customers?.name || '',
    customer_phone: q.customers?.phone || '',
    customer_address: q.customers?.address || '',
  }));
}

export async function getQuotationById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured()) return localDb.getQuotationById(id);
  const { data, error } = await supabaseAdmin
    .from('quotations')
    .select(`
      *,
      customers (
        name,
        phone,
        address,
        gstin,
        state
      ),
      quotation_items (*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return localDb.getQuotationById(id);
  return {
    ...data,
    customer_name: data.customers?.name || '',
    customer_phone: data.customers?.phone || '',
    customer_address: data.customers?.address || '',
    customer_gstin: data.customers?.gstin || '',
    customer_state: data.customers?.state || '',
    items: data.quotation_items || [],
  };
}

export async function getNextQuotationNumber(): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabaseAdmin
        .from('quotations')
        .select('quotation_number')
        .order('created_at', { ascending: false })
        .limit(50);

      let maxNum = 0;
      if (data && data.length > 0) {
        for (const row of data) {
          const match = String(row.quotation_number || '').match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }

      const nextNum = Math.max(maxNum + 1, 1);
      return `QT-${String(nextNum).padStart(3, '0')}`;
    } catch (e) {}
  }
  return localDb.getNextQuotationNumber();
}

export async function createQuotation(data: any): Promise<any> {
  const id = data.id || ('qt_' + Date.now());
  const quotationNumber = data.quotation_number ? String(data.quotation_number).trim() : await getNextQuotationNumber();

  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      quotation_number: quotationNumber,
      customer_id: data.customer_id,
      site_address: data.site_address || '',
      validity_date: cleanDate(data.validity_date),
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount || 0),
      taxable_amount: Number(data.taxable_amount || 0),
      cgst: Number(data.cgst || 0),
      sgst: Number(data.sgst || 0),
      igst: Number(data.igst || 0),
      total_tax: Number(data.total_tax || 0),
      installation_charges: Number(data.installation_charges || 0),
      transport_charges: Number(data.transport_charges || 0),
      other_charges: Number(data.other_charges || 0),
      grand_total: Number(data.grand_total ?? data.total_amount ?? 0),
      status: data.status || 'draft',
      terms: data.terms || '',
      notes: data.notes || '',
    };

    const { error: qtErr } = await supabaseAdmin.from('quotations').insert(payload);
    if (qtErr) throw new Error(`Failed to create quotation: ${qtErr.message}`);

    if (Array.isArray(data.items) && data.items.length > 0) {
      const itemsPayload = data.items.map((it: any, idx: number) => ({
        id: `qitem_${id}_${idx}`,
        quotation_id: id,
        product_id: it.product_id || null,
        item_type: it.item_type || 'standard',
        description: it.description || 'Item',
        hsn_code: it.hsn_code || '7308',
        width: Number(it.width || 0),
        height: Number(it.height || 0),
        measurement_unit: it.measurement_unit || 'Feet',
        width_ft: Number(it.width_ft || 0),
        height_ft: Number(it.height_ft || 0),
        area_sqft: Number(it.area_sqft || 0),
        rate_per_sqft: Number(it.rate_per_sqft || 0),
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        material_charges: Number(it.material_charges || 0),
        motor_charges: Number(it.motor_charges || 0),
        spring_charges: Number(it.spring_charges || 0),
        gearbox_charges: Number(it.gearbox_charges || 0),
        installation_charges: Number(it.installation_charges || 0),
        discount: Number(it.discount || 0),
        taxable_amount: Number(it.taxable_amount || 0),
        gst_rate: Number(it.gst_rate || 18),
        total_amount: Number(it.total_amount || 0),
      }));

      await supabaseAdmin.from('quotation_items').insert(itemsPayload);
    }
  }

  try {
    localDb.createQuotation({ ...data, id, quotation_number: quotationNumber });
  } catch (e) {}

  return getQuotationById(id);
}

export async function updateQuotationStatus(id: string, status: string): Promise<any> {
  if (isSupabaseConfigured()) {
    await supabaseAdmin.from('quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  }
  try {
    localDb.updateQuotationStatus(id, status);
  } catch (e) {}
  return getQuotationById(id);
}

export async function deleteQuotation(id: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured()) {
    await supabaseAdmin.from('quotation_items').delete().eq('quotation_id', id);
    await supabaseAdmin.from('quotations').delete().eq('id', id);
  }
  try {
    localDb.deleteQuotation(id);
  } catch (e) {}
  return { success: true };
}

export async function convertQuotationToInvoice(quotationId: string): Promise<any> {
  const quotation = await getQuotationById(quotationId);
  if (!quotation) throw new Error('Quotation not found');
  if (quotation.status === 'converted') {
    throw new Error('This quotation has already been converted to an invoice.');
  }

  const nextInvoiceNumber = await getNextInvoiceNumber();
  const invoiceData = {
    invoice_number: nextInvoiceNumber,
    quotation_id: quotation.id,
    customer_id: quotation.customer_id,
    site_address: quotation.site_address,
    issue_date: new Date().toISOString().split('T')[0],
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    taxable_amount: quotation.taxable_amount,
    is_interstate: quotation.igst > 0,
    cgst: quotation.cgst,
    sgst: quotation.sgst,
    igst: quotation.igst,
    total_tax: quotation.total_tax,
    installation_charges: quotation.installation_charges,
    transport_charges: quotation.transport_charges,
    grand_total: quotation.grand_total,
    paid_amount: 0,
    terms: quotation.terms,
    notes: 'Converted from quotation #' + quotation.quotation_number,
    items: (quotation.items || []).map((it: any) => ({
      product_id: it.product_id || null,
      item_type: it.item_type || (it.product_id ? 'product' : 'shutter'),
      description: it.description,
      hsn_code: it.hsn_code || '7308',
      width: it.width,
      height: it.height,
      measurement_unit: it.measurement_unit,
      width_ft: it.width_ft,
      height_ft: it.height_ft,
      area_sqft: it.area_sqft,
      rate_per_sqft: it.rate_per_sqft,
      quantity: it.quantity,
      unit_price: it.unit_price,
      material_charges: it.material_charges || 0,
      motor_charges: it.motor_charges || 0,
      spring_charges: it.spring_charges || 0,
      gearbox_charges: it.gearbox_charges || 0,
      installation_charges: it.installation_charges || 0,
      discount: it.discount || 0,
      taxable_amount: it.taxable_amount,
      gst_rate: it.gst_rate,
      cgst_amount: it.cgst_amount || ((it.taxable_amount || 0) * (it.gst_rate || 18) / 200),
      sgst_amount: it.sgst_amount || ((it.taxable_amount || 0) * (it.gst_rate || 18) / 200),
      igst_amount: it.igst_amount || 0,
      total_amount: it.total_amount,
    })),
  };

  return createSalesInvoice(invoiceData);
}

// ============================================================================
// 5. PAYMENTS & EXPENSES
// ============================================================================

export async function getPayments(type?: 'in' | 'out'): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getPayments(type);
  let query = supabaseAdmin.from('payments').select('*').order('payment_date', { ascending: false });
  if (type) query = query.eq('type', type);
  const { data, error } = await query;
  if (error) return localDb.getPayments(type);
  return data || [];
}

export async function createPayment(data: any): Promise<any> {
  const id = data.id || ('pay_' + Date.now());
  const paymentNumber = data.payment_number || `RCP-${Math.floor(100 + Math.random() * 900)}`;

  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      payment_number: paymentNumber,
      type: data.type || 'in',
      entity_type: data.entity_type || 'customer',
      entity_id: data.entity_id,
      invoice_id: data.invoice_id || null,
      amount: Number(data.amount || 0),
      payment_mode: data.payment_mode || 'Cash',
      reference_number: data.reference_number || '',
      notes: data.notes || '',
      payment_date: cleanDate(data.payment_date) || new Date().toISOString().split('T')[0],
    };

    const { error } = await supabaseAdmin.from('payments').insert(payload);
    if (error) throw new Error(`Failed to record payment: ${error.message}`);

    // If attached to an invoice, update invoice paid/balance amounts
    if (data.invoice_id) {
      const { data: inv } = await supabaseAdmin.from('sales_invoices').select('grand_total, paid_amount').eq('id', data.invoice_id).single();
      if (inv) {
        const newPaid = Number(inv.paid_amount || 0) + Number(data.amount || 0);
        const newBal = Math.max(0, Number(inv.grand_total || 0) - newPaid);
        const paymentStatus = newBal === 0 ? 'paid' : 'partial';
        await supabaseAdmin.from('sales_invoices').update({
          paid_amount: newPaid,
          balance_amount: newBal,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        }).eq('id', data.invoice_id);
      }
    }

    // Update customer current balance
    if (data.entity_id && (data.entity_type === 'customer' || !data.entity_type)) {
      const { data: cust } = await supabaseAdmin.from('customers').select('current_balance').eq('id', data.entity_id).single();
      if (cust) {
        const newBal = Math.max(0, Number(cust.current_balance || 0) - Number(data.amount || 0));
        await supabaseAdmin.from('customers').update({ current_balance: newBal, updated_at: new Date().toISOString() }).eq('id', data.entity_id);
      }
    }
  }

  try {
    localDb.createPayment({ ...data, id, payment_number: paymentNumber });
  } catch (e) {}

  return { id, payment_number: paymentNumber, ...data };
}

export async function getExpenses(category?: string): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getExpenses(category);
  let query = supabaseAdmin.from('expenses').select('*').order('expense_date', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) return localDb.getExpenses(category);
  return data || [];
}

export async function createExpense(data: any): Promise<any> {
  const id = data.id || ('exp_' + Date.now());
  const expenseNumber = data.expense_number || `EXP-${Math.floor(100 + Math.random() * 900)}`;

  // Map category to Supabase CHECK constraint
  const validCategories = [
    'Material Expenses', 'Labour Expenses', 'Transportation',
    'Electricity', 'Workshop Expenses', 'Installation Expenses', 'Other Expenses'
  ];
  let cat = data.category || 'Other Expenses';
  if (!validCategories.includes(cat)) {
    if (cat.toLowerCase().includes('material')) cat = 'Material Expenses';
    else if (cat.toLowerCase().includes('labour') || cat.toLowerCase().includes('salary')) cat = 'Labour Expenses';
    else if (cat.toLowerCase().includes('transport')) cat = 'Transportation';
    else if (cat.toLowerCase().includes('electric') || cat.toLowerCase().includes('power')) cat = 'Electricity';
    else if (cat.toLowerCase().includes('workshop')) cat = 'Workshop Expenses';
    else if (cat.toLowerCase().includes('install')) cat = 'Installation Expenses';
    else cat = 'Other Expenses';
  }

  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      expense_number: expenseNumber,
      category: cat,
      title: data.title,
      amount: Number(data.amount || 0),
      payment_mode: data.payment_mode || 'Cash',
      expense_date: cleanDate(data.expense_date) || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
    };
    const { error } = await supabaseAdmin.from('expenses').insert(payload);
    if (error) throw new Error(`Failed to create expense: ${error.message}`);
  }
  try {
    localDb.createExpense({ ...data, id, expense_number: expenseNumber, category: cat });
  } catch (e) {}
  return { id, expense_number: expenseNumber, category: cat, ...data };
}

// ============================================================================
// 6. EMPLOYEES, ATTENDANCE & SALARY
// ============================================================================

export async function getEmployees(): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getEmployees();
  const { data, error } = await supabaseAdmin.from('employees').select('*').order('full_name');
  if (error) return localDb.getEmployees();
  return data || [];
}

export async function getEmployeeById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured()) return localDb.getEmployeeById(id);
  const { data, error } = await supabaseAdmin.from('employees').select('*').eq('id', id).single();
  if (error || !data) return localDb.getEmployeeById(id);
  return data;
}

export async function createEmployee(data: any): Promise<any> {
  const id = data.id || ('emp_' + Date.now());
  const empCode = data.emp_code || `EMP-${Math.floor(100 + Math.random() * 900)}`;

  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      emp_code: empCode,
      full_name: data.full_name,
      phone: data.phone,
      alternate_phone: data.alternate_phone || null,
      address: data.address || null,
      job_role: data.job_role || 'Worker',
      department: data.department || 'Workshop',
      joining_date: cleanDate(data.joining_date) || new Date().toISOString().split('T')[0],
      employment_type: data.employment_type || 'full_time',
      salary_type: data.salary_type || 'monthly',
      base_salary: Number(data.base_salary || 0),
      employment_status: data.employment_status || 'active',
      notes: data.notes || null,
    };
    const { error } = await supabaseAdmin.from('employees').insert(payload);
    if (error) throw new Error(`Failed to create employee: ${error.message}`);
  }

  try {
    localDb.createEmployee({ ...data, id, emp_code: empCode });
  } catch (e) {}

  return getEmployeeById(id);
}

export async function updateEmployee(id: string, data: any): Promise<any> {
  if (isSupabaseConfigured()) {
    const payload: any = { updated_at: new Date().toISOString() };
    const fields = [
      'full_name', 'phone', 'alternate_phone', 'address', 'job_role',
      'department', 'joining_date', 'employment_type', 'salary_type',
      'base_salary', 'employment_status', 'notes'
    ];
    for (const f of fields) {
      if (data[f] !== undefined) {
        payload[f] = f === 'joining_date' ? cleanDate(data[f]) : data[f];
      }
    }
    const { error } = await supabaseAdmin.from('employees').update(payload).eq('id', id);
    if (error) throw new Error(`Failed to update employee: ${error.message}`);
  }

  try {
    localDb.updateEmployee(id, data);
  } catch (e) {}

  return getEmployeeById(id);
}

export async function deleteEmployee(id: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured()) {
    const { error } = await supabaseAdmin.from('employees').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete employee: ${error.message}`);
  }
  try {
    localDb.deleteEmployee(id);
  } catch (e) {}
  return { success: true };
}

export async function getDailyAttendance(date: string): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getDailyAttendance(date);
  const cleanD = cleanDate(date) || new Date().toISOString().split('T')[0];

  const { data: emps } = await supabaseAdmin.from('employees').select('*').eq('employment_status', 'active').order('full_name');
  const { data: records } = await supabaseAdmin.from('attendance_records').select('*').eq('attendance_date', cleanD);

  const recordMap = new Map((records || []).map((r: any) => [r.employee_id, r]));

  return (emps || []).map((emp: any) => {
    const rec = recordMap.get(emp.id);
    return {
      employee_id: emp.id,
      emp_code: emp.emp_code,
      full_name: emp.full_name,
      job_role: emp.job_role,
      department: emp.department,
      salary_type: emp.salary_type,
      base_salary: emp.base_salary,
      attendance_id: rec?.id || null,
      attendance_date: cleanD,
      status: rec?.status || null,
      check_in_time: rec?.check_in_time || null,
      notes: rec?.notes || '',
      marked_by_name: rec?.marked_by_name || null,
    };
  });
}

export async function markAttendanceBatch(records: any[], markedByUserId: string, markedByName: string): Promise<any> {
  if (isSupabaseConfigured()) {
    for (const r of records) {
      if (!r.employee_id || !r.attendance_date || !r.status) continue;
      const cleanD = cleanDate(r.attendance_date);
      const payload = {
        employee_id: r.employee_id,
        business_id: 'biz_al_ameen_01',
        attendance_date: cleanD,
        status: r.status,
        check_in_time: r.check_in_time || null,
        notes: r.notes || null,
        marked_by_user_id: markedByUserId || 'usr_admin_01',
        marked_by_name: markedByName || 'Admin',
        updated_at: new Date().toISOString(),
      };
      await supabaseAdmin.from('attendance_records').upsert(payload, { onConflict: 'employee_id,attendance_date' });
    }
  }

  try {
    const cleanDateStr = cleanDate(records[0]?.attendance_date) || new Date().toISOString().split('T')[0];
    localDb.markAttendanceBatch(cleanDateStr, records, markedByUserId, markedByName);
  } catch (e) {}

  return { success: true };
}

export async function getSalaryPayments(month?: number, year?: number): Promise<any[]> {
  if (!isSupabaseConfigured()) return localDb.getSalaryPayments({ month, year });
  let query = supabaseAdmin.from('salary_payments').select(`
    *,
    employees (
      full_name,
      emp_code,
      job_role,
      department
    )
  `).order('created_at', { ascending: false });

  if (month) query = query.eq('period_month', month);
  if (year) query = query.eq('period_year', year);

  const { data, error } = await query;
  if (error) return localDb.getSalaryPayments({ month, year });

  return (data || []).map((sp: any) => ({
    ...sp,
    full_name: sp.employees?.full_name || '',
    emp_code: sp.employees?.emp_code || '',
    job_role: sp.employees?.job_role || '',
    department: sp.employees?.department || '',
  }));
}

export async function recordSalaryPayment(data: any): Promise<any> {
  const id = data.id || ('sal_' + Date.now());
  const paymentNumber = data.payment_number || `PAY-SAL-${Math.floor(100 + Math.random() * 900)}`;

  if (isSupabaseConfigured()) {
    const payload = {
      id,
      business_id: 'biz_al_ameen_01',
      payment_number: paymentNumber,
      employee_id: data.employee_id,
      period_month: Number(data.period_month),
      period_year: Number(data.period_year),
      salary_type: data.salary_type || 'monthly',
      base_rate: Number(data.base_rate || 0),
      total_days_in_month: Number(data.total_days_in_month || 30),
      days_present: Number(data.days_present || 0),
      days_absent: Number(data.days_absent || 0),
      days_half_day: Number(data.days_half_day || 0),
      days_leave: Number(data.days_leave || 0),
      earned_salary: Number(data.earned_salary || 0),
      allowances: Number(data.allowances || 0),
      bonuses: Number(data.bonuses || 0),
      deductions: Number(data.deductions || 0),
      advance_deducted: Number(data.advance_deducted || 0),
      net_payable: Number(data.net_payable || 0),
      paid_amount: Number(data.paid_amount || 0),
      balance_amount: Number(data.balance_amount || 0),
      payment_mode: data.payment_mode || 'Cash',
      payment_date: cleanDate(data.payment_date) || new Date().toISOString().split('T')[0],
      payment_status: data.payment_status || 'paid',
      notes: data.notes || '',
      recorded_by_user_id: data.recorded_by_user_id || 'usr_admin_01',
    };

    const { error } = await supabaseAdmin.from('salary_payments').insert(payload);
    if (error) throw new Error(`Failed to record salary payment: ${error.message}`);
  }

  try {
    localDb.recordSalaryPayment({ ...data, id, payment_number: paymentNumber });
  } catch (e) {}

  return { id, payment_number: paymentNumber, ...data };
}

// ============================================================================
// 7. BUSINESS & SETTINGS & DASHBOARD
// ============================================================================

export async function getBusiness(): Promise<any> {
  if (isSupabaseConfigured()) {
    const { data } = await supabaseAdmin.from('businesses').select('*').limit(1).single();
    if (data) return data;
  }
  return localDb.getBusiness();
}

export async function updateBusiness(data: any): Promise<any> {
  if (isSupabaseConfigured()) {
    const { error } = await supabaseAdmin.from('businesses').update({
      ...data,
      updated_at: new Date().toISOString(),
    }).eq('id', 'biz_al_ameen_01');
    if (error) console.error('Supabase updateBusiness error:', error);
  }
  try {
    localDb.updateBusiness(data);
  } catch (e) {}
  return getBusiness();
}

export async function getBusinessSettings(): Promise<any> {
  if (isSupabaseConfigured()) {
    const { data } = await supabaseAdmin.from('business_settings').select('*').limit(1).single();
    if (data) return data;
  }
  return localDb.getBusinessSettings();
}

export async function updateBusinessSettings(data: any): Promise<any> {
  if (isSupabaseConfigured()) {
    const allowed = [
      'invoice_prefix', 'quotation_prefix', 'purchase_prefix', 'job_prefix',
      'payment_prefix', 'default_gst_rate', 'default_terms', 'bank_name',
      'bank_branch', 'account_name', 'account_number', 'ifsc_code', 'upi_id'
    ];
    const payload: any = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (data[k] !== undefined) payload[k] = data[k];
    }
    await supabaseAdmin.from('business_settings').update(payload).eq('business_id', 'biz_al_ameen_01');
  }
  try {
    localDb.updateBusinessSettings(data);
  } catch (e) {}
  return getBusinessSettings();
}

export async function getDashboardMetrics(): Promise<any> {
  if (!isSupabaseConfigured()) return localDb.getDashboardMetrics();

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: invs } = await supabaseAdmin.from('sales_invoices').select('grand_total, balance_amount, issue_date');
    let totalSales = 0;
    let todaySales = 0;
    let toCollect = 0;
    for (const inv of (invs || [])) {
      const g = Number(inv.grand_total || 0);
      const b = Number(inv.balance_amount || 0);
      totalSales += g;
      if (inv.issue_date === todayStr) todaySales += g;
      if (b > 0) toCollect += b;
    }

    const { data: prods } = await supabaseAdmin.from('products').select('current_stock, purchase_price');
    let stockValue = 0;
    for (const p of (prods || [])) {
      stockValue += Number(p.current_stock || 0) * Number(p.purchase_price || 0);
    }

    const { data: exps } = await supabaseAdmin.from('expenses').select('amount, payment_mode');
    let totalExpenses = 0;
    let cashExp = 0;
    for (const e of (exps || [])) {
      const a = Number(e.amount || 0);
      totalExpenses += a;
      if (e.payment_mode === 'Cash') cashExp += a;
    }

    const { data: payments } = await supabaseAdmin.from('payments').select('amount, type, payment_mode');
    let cashIn = 0;
    let cashOut = 0;
    let bankIn = 0;
    let bankOut = 0;
    for (const p of (payments || [])) {
      const amt = Number(p.amount || 0);
      if (p.payment_mode === 'Cash') {
        if (p.type === 'in') cashIn += amt;
        else cashOut += amt;
      } else {
        if (p.type === 'in') bankIn += amt;
        else bankOut += amt;
      }
    }

    const cashBalance = Math.max(0, cashIn - cashOut - cashExp);
    const bankBalance = Math.max(0, bankIn - bankOut);
    const totalProfit = Math.max(0, totalSales - totalExpenses);

    return {
      totalSales,
      todaySales,
      totalPurchase: 0,
      toCollect,
      toPay: 0,
      totalExpenses,
      totalProfit,
      stockValue,
      cashBalance,
      bankBalance,
    };
  } catch (e) {
    console.warn('Supabase dashboard metrics fallback:', e);
    return localDb.getDashboardMetrics();
  }
}

// ============================================================================
// 8. USERS & AUTHENTICATION
// ============================================================================

export async function getUserByIdentifier(identifier: string): Promise<any | null> {
  const clean = identifier.trim().toLowerCase();
  if (isSupabaseConfigured()) {
    const { data: userByEmail } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('email', clean)
      .limit(1)
      .single();

    if (userByEmail) return userByEmail;

    const { data: userByUsername } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('username', clean)
      .limit(1)
      .single();

    if (userByUsername) return userByUsername;
  }

  return localDb.getUserByIdentifier(identifier);
}

export async function updateLastLogin(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', id);
  }
  try {
    localDb.updateLastLogin(id);
  } catch (e) {}
}

export async function getCashiers(): Promise<any[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, full_name, phone, role, is_active, last_login, created_at, updated_at')
      .eq('role', 'cashier')
      .order('created_at', { ascending: false });

    if (!error && data) return data;
  }
  return localDb.getCashiers();
}
