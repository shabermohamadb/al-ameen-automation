'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  X,
  Calendar,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

const EXPENSE_CATEGORIES = [
  'All',
  'Material Expenses',
  'Labour Expenses',
  'Transportation',
  'Electricity',
  'Workshop Expenses',
  'Installation Expenses',
  'Other Expenses',
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Workshop Expenses');
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [expenseDate, setExpenseDate] = useState('2026-11-07');
  const [notes, setNotes] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const url = activeCategory === 'All' ? '/api/expenses' : `/api/expenses?category=${encodeURIComponent(activeCategory)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeCategory]);

  const handleSaveExpense = async () => {
    if (!title || amount <= 0) {
      alert('Title and valid amount are required');
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          amount,
          payment_mode: paymentMode,
          expense_date: expenseDate,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchExpenses();
        setTitle('');
        setAmount(1000);
        setNotes('');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const totalExpenseAmount = expenses.reduce((acc, it) => acc + (it.amount || 0), 0);

  const filteredExpenses = expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Expense Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Track factory overheads, welder wages, electricity, transportation and workshop costs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Expenses</span>
            <div className="text-lg font-black text-slate-900">{formatINR(totalExpenseAmount)}</div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Add Expense Voucher
          </button>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-[#13A89E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense description..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Voucher #</th>
                <th className="py-3.5 px-4">Expense Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {e.expense_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{e.title}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 text-[11px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{e.expense_date}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{e.payment_mode}</td>
                    <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">{e.notes || '-'}</td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-600 text-sm">
                      {formatINR(e.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">Add Expense Voucher</h3>
              </div>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Expense Title:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Workshop Monthly Rent, Argon Gas Refill"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Category:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  {EXPENSE_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Amount (₹):</label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-rose-600 text-sm"
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
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Expense Date:</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Narration / Notes:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid to Santhaipet shed owner"
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
                onClick={handleSaveExpense}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
