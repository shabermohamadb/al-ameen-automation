'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  X,
  Calendar,
  Building,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Payment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [type, setType] = useState<'in' | 'out'>('in');
  const [entityId, setEntityId] = useState('');
  const [amount, setAmount] = useState<number>(5000);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, cRes, sRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/customers'),
        fetch('/api/suppliers'),
      ]);
      const [payData, cData, sData] = await Promise.all([
        payRes.json(),
        cRes.json(),
        sRes.json(),
      ]);

      if (payData.success) setPayments(payData.data);
      if (cData.success) {
        setCustomers(cData.data);
        if (cData.data.length > 0 && !entityId) setEntityId(cData.data[0].id);
      }
      if (sData.success) setSuppliers(sData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePayment = async () => {
    if (!entityId || amount <= 0) {
      alert('Please select party and enter a valid amount');
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          entity_type: type === 'in' ? 'customer' : 'supplier',
          entity_id: entityId,
          amount,
          payment_mode: paymentMode,
          reference_number: refNumber,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchData();
        setAmount(0);
        setRefNumber('');
        setNotes('');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesSearch =
      (p.entity_name && p.entity_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.payment_number && p.payment_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Payments & Settlements
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Track payments received from clients and supplier disbursements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setType('in');
              if (customers.length > 0) setEntityId(customers[0].id);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Received Payment (In)
          </button>
          <button
            onClick={() => {
              setType('out');
              if (suppliers.length > 0) setEntityId(suppliers[0].id);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            Make Payment (Out)
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'in', label: 'Received (Inflow)' },
            { id: 'out', label: 'Paid (Outflow)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                filterType === t.id
                  ? 'bg-[#13A89E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party, receipt number, reference..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Receipt / Ref #</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Party / Customer / Supplier</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4">Reference Note</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment transactions logged.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isInflow = p.type === 'in';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {p.payment_number}
                      </td>
                      <td className="py-3.5 px-4">
                        {isInflow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700">
                            <ArrowDownLeft className="w-3 h-3" /> Received
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700">
                            <ArrowUpRight className="w-3 h-3" /> Paid Out
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {p.entity_name || 'Counter Customer'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{p.payment_date}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 text-[11px]">
                          {p.payment_mode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {p.reference_number ? `Ref: ${p.reference_number}` : p.notes || '-'}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-black text-sm ${
                          isInflow ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isInflow ? `+${formatINR(p.amount)}` : `-${formatINR(p.amount)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">
                  {type === 'in' ? 'Record Customer Payment Received' : 'Record Supplier Payment Made'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Select {type === 'in' ? 'Customer' : 'Supplier'}:
                </label>
                <select
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {type === 'in'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Due: {formatINR(c.current_balance)})
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Due: {formatINR(s.balance)})
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Amount (₹):</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-[#172B4D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Payment Mode:</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="Card">Card / POS</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Reference / Transaction ID (Optional):
                </label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. UPI/1948291048 or Cheque #88392"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Notes / Narration:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Rolling shutter advance, Final settlement"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                onClick={handleSavePayment}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
