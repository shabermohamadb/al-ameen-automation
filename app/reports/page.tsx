'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

type ReportType =
  | 'gst_summary'
  | 'profit_loss'
  | 'sales_report'
  | 'purchases_report'
  | 'customer_outstanding'
  | 'supplier_outstanding'
  | 'stock_valuation'
  | 'expense_breakdown';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('gst_summary');
  const [metrics, setMetrics] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashRes, invRes, purRes, custRes, suppRes, prodRes, expRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/invoices'),
          fetch('/api/purchases'),
          fetch('/api/customers'),
          fetch('/api/suppliers'),
          fetch('/api/products'),
          fetch('/api/expenses'),
        ]);

        const [dash, inv, pur, cust, supp, prod, exp] = await Promise.all([
          dashRes.json(),
          invRes.json(),
          purRes.json(),
          custRes.json(),
          suppRes.json(),
          prodRes.json(),
          expRes.json(),
        ]);

        if (dash.success) setMetrics(dash.data);
        if (inv.success) setInvoices(inv.data);
        if (pur.success) setPurchases(pur.data);
        if (cust.success) setCustomers(cust.data);
        if (supp.success) setSuppliers(supp.data);
        if (prod.success) setProducts(prod.data);
        if (exp.success) setExpenses(exp.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalSales = invoices.reduce((acc, it) => acc + (it.grand_total || 0), 0);
  const totalTaxable = invoices.reduce((acc, it) => acc + (it.taxable_amount || 0), 0);
  const totalCGST = invoices.reduce((acc, it) => acc + (it.cgst || 0), 0);
  const totalSGST = invoices.reduce((acc, it) => acc + (it.sgst || 0), 0);
  const totalPurchases = purchases.reduce((acc, it) => acc + (it.grand_total || 0), 0);
  const totalExpenses = expenses.reduce((acc, it) => acc + (it.amount || 0), 0);
  const netProfit = Math.max(0, totalSales - totalPurchases - totalExpenses);

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (reportType === 'gst_summary') {
      csvContent += 'Invoice Number,Date,Customer,GSTIN,Taxable Amount,CGST 9%,SGST 9%,Grand Total\n';
      invoices.forEach((inv) => {
        csvContent += `"${inv.invoice_number}","${inv.issue_date}","${inv.customer_name}","${inv.customer_gstin || ''}",${inv.taxable_amount},${inv.cgst},${inv.sgst},${inv.grand_total}\n`;
      });
    } else if (reportType === 'customer_outstanding') {
      csvContent += 'Customer Name,Phone,Address,Total Invoiced,Paid Amount,Pending Balance\n';
      customers.forEach((c) => {
        csvContent += `"${c.name}","${c.phone}","${c.address}",${c.total_sales || 0},${c.total_paid || 0},${c.current_balance || 0}\n`;
      });
    } else {
      csvContent += 'Item,Category,Current Stock,Unit,Purchase Price,Stock Valuation\n';
      products.forEach((p) => {
        csvContent += `"${p.name}","${p.category_name || ''}",${p.current_stock},"${p.unit}",${p.purchase_price},${p.current_stock * p.purchase_price}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Al_Ameen_Report_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Business Intelligence & Reports
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                GSTR-1 tax compliance, Profit & Loss analysis, customer dues, and inventory valuation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-[#13A89E] font-bold text-xs rounded-xl border border-teal-200 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'gst_summary', label: 'GST Summary (GSTR-1)' },
          { id: 'profit_loss', label: 'Profit & Loss Statement' },
          { id: 'customer_outstanding', label: 'Customer Outstanding' },
          { id: 'supplier_outstanding', label: 'Supplier Outstanding' },
          { id: 'stock_valuation', label: 'Stock Valuation Report' },
          { id: 'expense_breakdown', label: 'Expense Breakdown' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as ReportType)}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
              reportType === tab.id
                ? 'bg-[#13A89E] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. GST Summary View */}
      {reportType === 'gst_summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100">
              <span className="text-slate-500 font-semibold text-xs">Taxable Value</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(totalTaxable)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100">
              <span className="text-slate-500 font-semibold text-xs">Total CGST (9%)</span>
              <div className="text-xl font-bold text-[#172B4D] mt-1">{formatINR(totalCGST)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100">
              <span className="text-slate-500 font-semibold text-xs">Total SGST (9%)</span>
              <div className="text-xl font-bold text-[#172B4D] mt-1">{formatINR(totalSGST)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100">
              <span className="text-slate-500 font-semibold text-xs">Gross GST Collected</span>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {formatINR(totalCGST + totalSGST)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">GSTR-1 Outward Supplies Register</h3>
              <span className="text-xs text-slate-400">HSN Classified</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4 text-right">Taxable Amount</th>
                    <th className="py-3 px-4 text-right">CGST (9%)</th>
                    <th className="py-3 px-4 text-right">SGST (9%)</th>
                    <th className="py-3 px-4 text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-600">{inv.issue_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{inv.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{inv.customer_gstin || 'B2C'}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatINR(inv.taxable_amount)}</td>
                      <td className="py-3 px-4 text-right text-[#172B4D] font-semibold">{formatINR(inv.cgst)}</td>
                      <td className="py-3 px-4 text-right text-[#172B4D] font-semibold">{formatINR(inv.sgst)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatINR(inv.grand_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Profit & Loss View */}
      {reportType === 'profit_loss' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Profit & Loss Summary (Financial Year 2026-27)
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100 font-semibold">
              <span className="text-slate-600">Total Operating Revenue (Sales Invoices):</span>
              <span className="text-sm font-extrabold text-emerald-700">+{formatINR(totalSales)}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-100 font-semibold">
              <span className="text-slate-600">Cost of Goods Sold (Purchases / Raw Steel):</span>
              <span className="text-sm font-extrabold text-rose-600">-{formatINR(totalPurchases)}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-100 font-semibold">
              <span className="text-slate-600">Operational & Workshop Overhead Expenses:</span>
              <span className="text-sm font-extrabold text-rose-600">-{formatINR(totalExpenses)}</span>
            </div>

            <div className="flex justify-between items-center py-3 bg-teal-50 px-4 rounded-2xl border border-teal-100 text-sm font-black text-[#172B4D]">
              <span>NET BUSINESS PROFIT:</span>
              <span className="text-lg text-[#13A89E]">{formatINR(netProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Customer Outstanding View */}
      {reportType === 'customer_outstanding' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Customer Receivable Ledger</h3>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg">
              Total Dues: {formatINR(customers.reduce((acc, c) => acc + (c.current_balance || 0), 0))}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-right">Total Invoices</th>
                  <th className="py-3 px-4 text-right">Amount Invoiced</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Pending Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-600">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{c.address}</td>
                    <td className="py-3 px-4 text-right font-medium">{c.total_invoices || 0}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(c.total_sales || 0)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatINR(c.total_paid || 0)}</td>
                    <td className="py-3 px-4 text-right font-black text-rose-600">{formatINR(c.current_balance || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Stock Valuation Report */}
      {reportType === 'stock_valuation' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Inventory Asset Valuation</h3>
            <span className="text-xs font-bold text-[#13A89E] bg-teal-50 px-3 py-1 rounded-lg">
              Total Stock Value: {formatINR(products.reduce((acc, p) => acc + p.current_stock * p.purchase_price, 0))}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">In Stock</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4 text-right">Purchase Cost</th>
                  <th className="py-3 px-4 text-right">Asset Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-[#172B4D] font-semibold">{p.category_name}</td>
                    <td className="py-3 px-4 text-center font-black">{p.current_stock}</td>
                    <td className="py-3 px-4 text-slate-500">{p.unit}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatINR(p.purchase_price)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      {formatINR(p.current_stock * p.purchase_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
