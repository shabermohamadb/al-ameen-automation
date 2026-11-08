'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Building,
  UserCheck,
  X,
  ExternalLink,
  Receipt,
  Wrench,
  Clock,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

export default function CustomersAndSuppliersPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Customer Ledger Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);

  // Add Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // Customer Form
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAltPhone, setCAltPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cGstin, setCGstin] = useState('');
  const [cOpeningBal, setCOpeningBal] = useState(0);

  // Supplier Form
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sAddress, setSAddress] = useState('');
  const [sGstin, setSGstin] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, sRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/suppliers'),
      ]);
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);

      if (cData.success) setCustomers(cData.data);
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

  const handleOpenLedger = async (customerId: string) => {
    try {
      setCustomerDetailsLoading(true);
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!cName || !cPhone) {
      alert('Name and Phone are required');
      return;
    }

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cName,
          phone: cPhone,
          alternate_phone: cAltPhone,
          email: cEmail,
          address: cAddress,
          gstin: cGstin,
          opening_balance: cOpeningBal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddCustomerModal(false);
        fetchData();
        setCName('');
        setCPhone('');
        setCAddress('');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleSaveSupplier = async () => {
    if (!sName || !sPhone) {
      alert('Supplier name and phone are required');
      return;
    }

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sName,
          contact_person: sContact,
          phone: sPhone,
          email: sEmail,
          address: sAddress,
          gstin: sGstin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSupplierModal(false);
        fetchData();
        setSName('');
        setSPhone('');
        setSAddress('');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Customers & Suppliers Directory
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive customer profiles, supplier ledgers, and transaction history
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'customers' ? (
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          ) : (
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'customers'
                ? 'bg-[#13A89E] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'suppliers'
                ? 'bg-[#13A89E] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
          />
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {activeTab === 'customers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Phone Numbers</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4">GSTIN</th>
                  <th className="py-3.5 px-4 text-right">Total Invoices</th>
                  <th className="py-3.5 px-4 text-right">Total Sales</th>
                  <th className="py-3.5 px-4 text-right">Pending Balance</th>
                  <th className="py-3.5 px-4 text-center">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading customers...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div>{c.phone}</div>
                        {c.alternate_phone && (
                          <div className="text-[11px] text-slate-400">{c.alternate_phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">{c.address}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{c.gstin || 'Unregistered'}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        {c.total_invoices || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(c.total_sales || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600">
                        {formatINR(c.current_balance || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenLedger(c.id)}
                          className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-[#13A89E] font-bold rounded-lg transition inline-flex items-center gap-1"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Supplier Name</th>
                  <th className="py-3.5 px-4">Contact Person</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4">GSTIN</th>
                  <th className="py-3.5 px-4 text-right">Total Purchases</th>
                  <th className="py-3.5 px-4 text-right">To Pay Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading suppliers...
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.contact_person || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.phone}</td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">{s.address}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{s.gstin || '-'}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(s.total_amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600">
                        {formatINR(s.balance || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Customer Profile & Ledger Drawer/Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#13A89E] text-white flex items-center justify-center font-bold text-base">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedCustomer.name}</h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {selectedCustomer.phone} • {selectedCustomer.address}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Profile Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Orders</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {selectedCustomer.invoices?.length || 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Sales</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {formatINR(
                      (selectedCustomer.invoices || []).reduce(
                        (acc: number, it: any) => acc + (it.grand_total || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Received</div>
                  <div className="text-lg font-black text-sky-700 mt-0.5">
                    {formatINR(
                      (selectedCustomer.payments || []).reduce(
                        (acc: number, it: any) => acc + (it.amount || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">To Collect</div>
                  <div className="text-lg font-black text-rose-600 mt-0.5">
                    {formatINR(selectedCustomer.current_balance || 0)}
                  </div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#13A89E]" />
                  Tax Invoices History
                </h4>
                {selectedCustomer.invoices?.length === 0 ? (
                  <p className="text-slate-400">No invoices generated yet.</p>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {selectedCustomer.invoices.map((inv: any) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{inv.invoice_number}</div>
                          <div className="text-slate-400 text-[11px]">{inv.issue_date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-slate-900">{formatINR(inv.grand_total)}</div>
                          <div className="text-[11px] text-rose-500">Balance: {formatINR(inv.balance_amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payments History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Payments Received Ledger
                </h4>
                {selectedCustomer.payments?.length === 0 ? (
                  <p className="text-slate-400">No payments logged yet.</p>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {selectedCustomer.payments.map((p: any) => (
                      <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{p.payment_number} • {p.payment_mode}</div>
                          <div className="text-slate-400 text-[11px]">{p.payment_date} {p.reference_number ? `(${p.reference_number})` : ''}</div>
                        </div>
                        <div className="font-black text-emerald-600">{formatINR(p.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Customer / Firm Name:</label>
                <input
                  type="text"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="e.g. Rahul Enterprises"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Primary Phone:</label>
                  <input
                    type="text"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    placeholder="98421 00000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Alternate Phone:</label>
                  <input
                    type="text"
                    value={cAltPhone}
                    onChange={(e) => setCAltPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Full Site / Shop Address:</label>
                <input
                  type="text"
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  placeholder="e.g. 124 Meyyanur Main Road, Salem - 636004"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">GSTIN (Optional):</label>
                  <input
                    type="text"
                    value={cGstin}
                    onChange={(e) => setCGstin(e.target.value.toUpperCase())}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Opening Balance (₹):</label>
                  <input
                    type="number"
                    value={cOpeningBal}
                    onChange={(e) => setCOpeningBal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Supplier</h3>
              <button onClick={() => setShowAddSupplierModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Supplier Company Name:</label>
                <input
                  type="text"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="e.g. Tata Steel Distributors"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Contact Person:</label>
                  <input
                    type="text"
                    value={sContact}
                    onChange={(e) => setSContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Phone Number:</label>
                  <input
                    type="text"
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Warehouse Address:</label>
                <input
                  type="text"
                  value={sAddress}
                  onChange={(e) => setSAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">GSTIN:</label>
                <input
                  type="text"
                  value={sGstin}
                  onChange={(e) => setSGstin(e.target.value.toUpperCase())}
                  placeholder="33AABCS0000Z1Z1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSupplier}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
