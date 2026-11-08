'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Package,
  Banknote,
  Building,
  ArrowUpRight,
  Plus,
  Users,
  Phone,
  BarChart2,
  Calendar,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatINR } from '@/lib/gst';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChartRange, setActiveChartRange] = useState<'7Days' | '30Days' | '3Months' | '1Year'>('7Days');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Real values strictly from database
  const totalSales = metrics?.totalSales ?? 0;
  const totalPurchase = metrics?.totalPurchase ?? 0;
  const toCollect = metrics?.toCollect ?? 0;
  const toPay = metrics?.toPay ?? 0;
  const stockValue = metrics?.stockValue ?? 0;
  const totalProfit = metrics?.totalProfit ?? 0;
  const cashBalance = metrics?.cashBalance ?? 0;
  const bankBalance = metrics?.bankBalance ?? 0;

  const chartData = metrics?.chartData || [];
  const recentTransactions = metrics?.recentTransactions || [];

  const profitMargin = totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0;

  const donutData = [
    { name: 'Sales', value: totalSales, color: '#13A89E' },
    { name: 'Purchase', value: totalPurchase, color: '#172B4D' },
    { name: 'Profit', value: totalProfit, color: '#16A36A' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Good Morning Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-[#E2E8F0] shadow-xs p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 p-2 rounded-2xl bg-white shadow-sm border border-[#E2E8F0] flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png"
              alt="Al Ameen Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#172B4D] tracking-tight">
              Good Morning, Admin! 👋
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Here's what's happening with your business today.
            </p>
          </div>
        </div>

        {/* Right Details: Phone numbers & Rolling Shutter Graphic */}
        <div className="flex items-center gap-6 z-10">
          <div className="hidden sm:flex items-center gap-3 bg-white/90 backdrop-blur px-4 py-2.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800">96294 95874</div>
              <div className="text-xs font-bold text-slate-800">63835 14898</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-gradient-to-r from-[#0e172e] to-[#172B4D] text-white px-5 py-3 rounded-2xl shadow-md border border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo_symbol_white.png"
                alt="Al Ameen Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Al Ameen Automation</div>
              <div className="text-[11px] text-[#13A89E]">Rolling Shutter Manufacturing</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Financial Cards Grid (8 Cards: 2 Rows of 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-2xl p-5 border border-teal-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <ArrowUpRight className="w-3.5 h-3.5" /> +12%
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalSales)}</div>
        </div>

        {/* Card 2: Total Purchase */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <ArrowUpRight className="w-3.5 h-3.5" /> +8%
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchase</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalPurchase)}</div>
        </div>

        {/* Card 3: To Collect */}
        <div className="bg-white rounded-2xl p-5 border border-teal-100 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <Link href="/customers" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5">
                View →
              </Link>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Collect</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(toCollect)}</div>
          </div>
        </div>

        {/* Card 4: To Pay */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <Link href="/purchases" className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
                View →
              </Link>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Pay</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(toPay)}</div>
          </div>
        </div>

        {/* Card 5: Stock Value */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Live Inventory</span>
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Value</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(stockValue)}</div>
        </div>

        {/* Card 6: Total Profit */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <ArrowUpRight className="w-3.5 h-3.5" /> +15%
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Profit</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalProfit)}</div>
        </div>

        {/* Card 7: Cash Balance */}
        <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Counter Cash</span>
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Balance</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(cashBalance)}</div>
        </div>

        {/* Card 8: Bank Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-[#172B4D] flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <span className="text-xs text-slate-400 font-medium">SBI Kadayapatti</span>
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Balance</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(bankBalance)}</div>
        </div>
      </div>

      {/* 3. Main Analytics & Transactions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Sales Overview Chart & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Overview Bar Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Sales Overview</h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#13A89E]"></span>
                      Sales
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#172B4D]"></span>
                      Purchase
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Range Filter Buttons */}
              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl text-xs font-semibold text-slate-600">
                {(['7Days', '30Days', '3Months', '1Year'] as const).map((range) => {
                  const labels = { '7Days': '7 Days', '30Days': '30 Days', '3Months': '3 Months', '1Year': '1 Year' };
                  return (
                    <button
                      key={range}
                      onClick={() => setActiveChartRange(range)}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        activeChartRange === range
                          ? 'bg-[#13A89E] text-white shadow-xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      {labels[range]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recharts Bar Graph */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₹ ${Number(value).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#13A89E" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="purchase" fill="#172B4D" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions & Business Performance Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <h3 className="font-bold text-slate-900 text-base">Quick Actions</h3>
                </div>
                <Link href="/sales" className="text-xs font-semibold text-[#13A89E] hover:text-[#0E8A81] flex items-center gap-1">
                  View All →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/sales?new=true"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/60 text-center transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#13A89E] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Create Bill / Invoice</span>
                </Link>

                <Link
                  href="/purchases?new=true"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-center transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Add Purchase</span>
                </Link>

                <Link
                  href="/products?new=true"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-100 text-center transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Add Product</span>
                </Link>

                <Link
                  href="/customers?new=true"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100/80 border border-sky-100 text-center transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Add Customer</span>
                </Link>
              </div>
            </div>

            {/* Business Performance Donut Gauge */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">🏆</span>
                  <h3 className="font-bold text-slate-900 text-base">Business Performance</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600">
                  This Month
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Donut Gauge */}
                <div className="relative w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        innerRadius={40}
                        outerRadius={56}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-black text-slate-900">{profitMargin}%</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Margin</span>
                  </div>
                </div>

                {/* Legend Values */}
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#13A89E]"></span>
                      Sales
                    </span>
                    <span className="font-bold text-slate-900">{formatINR(totalSales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#172B4D]"></span>
                      Purchase
                    </span>
                    <span className="font-bold text-slate-900">{formatINR(totalPurchase)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                      Profit
                    </span>
                    <span className="font-bold text-slate-900">{formatINR(totalProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Transactions & Upgrade Promo */}
        <div className="space-y-6">
          {/* Recent Transactions Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#13A89E]" />
                <h3 className="font-bold text-slate-900 text-base">Recent Transactions</h3>
              </div>
              <Link href="/sales" className="text-xs font-semibold text-[#13A89E] hover:text-[#0E8A81]">
                View All →
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">No recent transactions</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Transactions will appear as invoices and payments are recorded.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((tx: any, idx: number) => {
                  let badgeBg = 'bg-teal-50 text-[#13A89E]';
                  if (tx.kind === 'purchase') badgeBg = 'bg-rose-100 text-rose-700';
                  if (tx.kind === 'payment') badgeBg = 'bg-emerald-100 text-emerald-700';
                  if (tx.kind === 'expense') badgeBg = 'bg-blue-100 text-blue-700';

                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${badgeBg} flex items-center justify-center shrink-0`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{tx.title}</div>
                          <div className="text-[11px] text-slate-500">{tx.subtitle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">{formatINR(tx.amount)}</div>
                        <div className="text-[10px] text-slate-400">{tx.timeAgo}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Genuine Business Profile & Verified GST Status */}
          <div className="rounded-3xl bg-gradient-to-br from-[#172B4D] via-[#132238] to-[#0A1C36] text-white p-6 shadow-md border border-[#203A65]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified GST Registered
                </div>
                <span className="text-[10px] text-slate-300 font-mono">State Code: 33</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  AL AMEEN WELDING WORKS & ROLLING SHUTTER MANUFACTURING
                </h4>
                <p className="text-xs text-slate-300 mt-1 font-mono">
                  GSTIN: 33CRHPD7107H1Z3
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-teal-300 block">Bank Account</span>
                  <span className="font-semibold text-white">SBI A/C: 41904105649</span>
                </div>
                <div>
                  <span className="text-[10px] text-teal-300 block">UPI Direct</span>
                  <span className="font-semibold text-emerald-300 truncate block">thasthagiralameen-1@okicici</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
