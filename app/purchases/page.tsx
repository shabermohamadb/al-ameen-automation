'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  PackagePlus,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  CreditCard,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Purchase Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('Raw Steel Material Coils');
  const [quantity, setQuantity] = useState(10);
  const [unitPrice, setUnitPrice] = useState(2500);
  const [gstRate, setGstRate] = useState(18);
  const [paidAmount, setPaidAmount] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes, prodRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/suppliers'),
        fetch('/api/products'),
      ]);
      const [pData, sData, prodData] = await Promise.all([
        pRes.json(),
        sRes.json(),
        prodRes.json(),
      ]);

      if (pData.success) setPurchases(pData.data);
      if (sData.success) {
        setSuppliers(sData.data);
        if (sData.data.length > 0) setSupplierId(sData.data[0].id);
      }
      if (prodData.success) {
        setProducts(prodData.data);
        if (prodData.data.length > 0) setProductId(prodData.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rawSubtotal = quantity * unitPrice;
  const taxAmount = Number(((rawSubtotal * gstRate) / 100).toFixed(2));
  const grandTotal = Number((rawSubtotal + taxAmount).toFixed(2));
  const balanceAmount = Math.max(0, grandTotal - paidAmount);

  const handleSavePurchase = async () => {
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          invoice_date: new Date().toISOString().split('T')[0],
          subtotal: rawSubtotal,
          discount: 0,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          paid_amount: paidAmount,
          items: [
            {
              product_id: productId || null,
              description,
              quantity,
              unit_price: unitPrice,
              gst_rate: gstRate,
              total_amount: grandTotal,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchase_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Purchases & Raw Materials
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Log vendor bills, automatically increase inventory, and manage supplier outstanding
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Add Purchase Entry
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search purchase bill number, supplier..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Purchase #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">GST</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">To Pay Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No purchase records found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.purchase_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{p.supplier_name}</div>
                      <div className="text-[11px] text-slate-400">{p.supplier_phone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.invoice_date}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatINR(p.subtotal)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {formatINR(p.tax_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatINR(p.grand_total)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                      {formatINR(p.paid_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-600">
                      {formatINR(p.balance_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.payment_status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600">
                          <CheckCircle className="w-3 h-3" /> Paid
                        </span>
                      ) : p.payment_status === 'partial' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-600">
                          <Clock className="w-3 h-3" /> Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600">
                          <AlertCircle className="w-3 h-3" /> Unpaid
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">New Purchase & Stock Intake</h3>
              </div>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Supplier:</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Product / Material (Stock will be added automatically):
                </label>
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    const p = products.find((pr) => pr.id === e.target.value);
                    if (p) {
                      setDescription(p.name);
                      setUnitPrice(p.purchase_price || 100);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (In stock: {p.current_stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Quantity Received:</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Purchase Rate / Unit (₹):</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">GST Rate (%):</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseFloat(e.target.value) || 18)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value={18}>18%</option>
                    <option value={12}>12%</option>
                    <option value={5}>5%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Payment Made Now (₹):</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable:</span>
                  <span className="font-semibold text-slate-900">{formatINR(rawSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST ({gstRate}%):</span>
                  <span className="font-semibold text-slate-900">{formatINR(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-emerald-950 pt-1 border-t border-emerald-200">
                  <span>Grand Total:</span>
                  <span>{formatINR(grandTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600 text-xs">
                  <span>Supplier Balance To Pay:</span>
                  <span>{formatINR(balanceAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePurchase}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Confirm Purchase & Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
