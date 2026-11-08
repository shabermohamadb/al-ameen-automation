'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  FileSpreadsheet,
  Ruler,
  Boxes,
  UserCheck,
  Truck,
  PlusCircle,
  Receipt,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  ShoppingBag,
} from 'lucide-react';

export default function CashierDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todayAttendanceMarked, setTodayAttendanceMarked] = useState<boolean>(false);
  const [attendanceCount, setAttendanceCount] = useState<{ present: number; total: number }>({ present: 0, total: 0 });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayInvoicesCount: 0,
    cashCollected: 0,
    totalProducts: 0,
  });

  const [todayFormatted, setTodayFormatted] = useState<string>('');

  useEffect(() => {
    setTodayFormatted(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );

    async function loadData() {
      try {
        setLoading(true);

        // 1. Current user
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }

        // 2. Attendance for today
        const todayStr = new Date().toISOString().split('T')[0];
        const attRes = await fetch(`/api/attendance?date=${todayStr}`);
        if (attRes.ok) {
          const attData = await attRes.json();
          if (Array.isArray(attData) && attData.length > 0) {
            const marked = attData.filter((r) => r.status && r.status !== 'unmarked');
            const present = attData.filter((r) => r.status === 'present' || r.status === 'late');
            setAttendanceCount({ present: present.length, total: attData.length });
            setTodayAttendanceMarked(marked.length === attData.length);
          }
        }

        // 3. Invoices
        const invRes = await fetch('/api/invoices');
        if (invRes.ok) {
          const invData = await invRes.json();
          if (invData.success && Array.isArray(invData.data)) {
            const list = invData.data;
            const todayInvs = list.filter((inv: any) => inv.issue_date === todayStr);
            const todayTotal = todayInvs.reduce((acc: number, inv: any) => acc + Number(inv.grand_total || 0), 0);
            const todayPaid = todayInvs.reduce((acc: number, inv: any) => acc + Number(inv.paid_amount || 0), 0);

            setMetrics((prev) => ({
              ...prev,
              todaySales: todayTotal,
              todayInvoicesCount: todayInvs.length,
              cashCollected: todayPaid,
            }));

            setRecentInvoices(list.slice(0, 8));
          }
        }

        // 4. Products count
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData.success && Array.isArray(prodData.data)) {
            setMetrics((prev) => ({ ...prev, totalProducts: prodData.data.length }));
          }
        }
      } catch (e) {
        console.error('Failed to load cashier dashboard:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#172B4D] via-[#132238] to-[#0A1C36] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#203A65]">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 p-2 shadow-lg border border-white/10 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo.png"
                alt="Al Ameen Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cashier Counter Terminal
                </span>
                <span className="text-xs text-slate-300">{todayFormatted}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {currentUser?.fullName || 'Cashier'}
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Al Ameen Automation Daily Counter Portal. Take morning worker attendance, create customer tax invoices, issue estimates, and track payments.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/sales/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl text-sm font-bold shadow-md shadow-teal-950/20 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Invoice</span>
            </Link>
            <Link
              href="/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Take Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Morning Attendance Reminder Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        todayAttendanceMarked
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              todayAttendanceMarked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-bounce'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                {todayAttendanceMarked
                  ? `Today's Worker Attendance Completed (${attendanceCount.present}/${attendanceCount.total} Present)`
                  : 'Action Required: Daily Worker Attendance Pending'}
              </h2>
              <p className="text-xs opacity-90 mt-0.5">
                {todayAttendanceMarked
                  ? 'All staff and shop floor fabricators marked for today. View or update attendance if late arrivals occur.'
                  : 'Take morning attendance for all workers, fabricators, welders, and technicians to ensure accurate payroll calculation.'}
              </p>
            </div>
          </div>

          <Link
            href="/attendance"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
              todayAttendanceMarked
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
            }`}
          >
            <span>{todayAttendanceMarked ? 'View Attendance' : 'Mark Morning Attendance'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Counter Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Billing</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#13A89E] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{metrics.todaySales.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#13A89E] font-semibold mt-1 inline-block">
            {metrics.todayInvoicesCount} invoices issued today
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash & Paid</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            ₹{metrics.cashCollected.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">Collected at counter</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {attendanceCount.present} <span className="text-xs font-normal text-slate-400">/ {attendanceCount.total}</span>
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 inline-block">
            {todayAttendanceMarked ? '100% Completed' : 'Pending Morning Roll'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Products & Parts</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#172B4D] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{metrics.totalProducts}</div>
          <span className="text-[11px] text-[#172B4D] font-semibold mt-1 inline-block">Available items</span>
        </div>
      </div>

      {/* Quick Action Hub for Counter */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Counter Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/sales/new"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#13A89E] hover:shadow-md transition group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">New Invoice</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Tax Invoice / Bill</span>
          </Link>

          <Link
            href="/quotations/new"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#13A89E] hover:shadow-md transition group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">New Quotation</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Estimate / Quote</span>
          </Link>

          <Link
            href="/attendance"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#13A89E] hover:shadow-md transition group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Daily Attendance</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Shop Floor Roll</span>
          </Link>

          <Link
            href="/calculator"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#13A89E] hover:shadow-md transition group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Ruler className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Calculator</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Sqft & Hardware</span>
          </Link>

          <Link
            href="/products"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#13A89E] hover:shadow-md transition group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#172B4D] flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Products & Rates</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Price & Stock Check</span>
          </Link>

          <Link
            href="/eway-bill"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#13A89E] hover:shadow-md transition group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">E-Way Bills</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Transport Passes</span>
          </Link>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Recent Counter Invoices</h2>
            <p className="text-xs text-slate-500">Latest sales invoices generated</p>
          </div>
          <Link
            href="/sales"
            className="text-xs font-bold text-[#13A89E] hover:text-[#0E8A81] flex items-center gap-1"
          >
            <span>View All Sales</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No sales invoices created yet. Start by creating an invoice above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-[#172B4D]">{inv.invoice_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{inv.customer_name || 'Walk-in Customer'}</td>
                    <td className="py-3 px-4 text-slate-500">{inv.issue_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{Number(inv.grand_total || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inv.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : inv.payment_status === 'partial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/sales/${inv.id}`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#13A89E] rounded-lg text-xs font-semibold transition"
                      >
                        View / Print
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
