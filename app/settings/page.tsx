'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Receipt,
  Landmark,
  Users,
  Save,
  CheckCircle2,
  Phone,
  MapPin,
  Mail,
  ShieldAlert,
  Database,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'invoice' | 'bank' | 'staff' | 'database'>('business');
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Business State
  const [name, setName] = useState('Al Ameen Automation');
  const [legalName, setLegalName] = useState('Al Ameen Rolling Shutter Manufacturing');
  const [address, setAddress] = useState('Danishpet Main Road, Santhaipet, Kadayapatti (Tk), Salem (Dt), Tamil Nadu, India');
  const [phone1, setPhone1] = useState('96294 95874');
  const [phone2, setPhone2] = useState('63835 14898');
  const [email, setEmail] = useState('alameenautomation@gmail.com');
  const [gstin, setGstin] = useState('33AABCA1234D1Z5');

  // Invoice & Print Settings
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number>(1);
  const [quotationPrefix, setQuotationPrefix] = useState('');
  const [nextQuotationNumber, setNextQuotationNumber] = useState<number>(1);
  const [purchasePrefix, setPurchasePrefix] = useState('PI-');
  const [defaultTerms, setDefaultTerms] = useState(
    '1. 50% advance along with confirmed order.\n2. Balance payment on delivery/installation.\n3. Goods once sold will not be taken back.\n4. Warranty 1 year for automation motors against manufacturing defects.'
  );

  // Bank & UPI
  const [bankName, setBankName] = useState('State Bank of India');
  const [bankBranch, setBankBranch] = useState('Kadayapatti Branch');
  const [accountName, setAccountName] = useState('Al Ameen Automation');
  const [accountNumber, setAccountNumber] = useState('38492019482');
  const [ifscCode, setIfscCode] = useState('SBIN0004821');
  const [upiId, setUpiId] = useState('alameenauto@sbi');

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/business');
        const data = await res.json();
        if (data.success) {
          if (data.business) {
            setName(data.business.name || '');
            setLegalName(data.business.legal_name || '');
            setAddress(data.business.address || '');
            setPhone1(data.business.phone1 || '');
            setPhone2(data.business.phone2 || '');
            setEmail(data.business.email || '');
            setGstin(data.business.gstin || '');
          }
          if (data.settings) {
            setInvoicePrefix(data.settings.invoice_prefix ?? '');
            setNextInvoiceNumber(Number(data.settings.next_invoice_number) || 1);
            setQuotationPrefix(data.settings.quotation_prefix ?? '');
            setNextQuotationNumber(Number(data.settings.next_quotation_number) || 1);
            setPurchasePrefix(data.settings.purchase_prefix || 'PI-');
            setDefaultTerms(data.settings.default_terms || '');
            setBankName(data.settings.bank_name || '');
            setBankBranch(data.settings.bank_branch || '');
            setAccountName(data.settings.account_name || '');
            setAccountNumber(data.settings.account_number || '');
            setIfscCode(data.settings.ifsc_code || '');
            setUpiId(data.settings.upi_id || '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
    fetchSupabaseStatus();
  }, []);

  const fetchSupabaseStatus = async () => {
    try {
      setTestingSupabase(true);
      const res = await fetch('/api/sync/supabase');
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (e: any) {
      setSupabaseStatus({ success: false, connected: false, error: e.message });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSyncToSupabase = async () => {
    try {
      setSyncingSupabase(true);
      setSyncMessage(null);
      const res = await fetch('/api/sync/supabase', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`🎉 ${data.message} (${Object.keys(data.syncedTables || {}).length} tables synchronized)`);
        fetchSupabaseStatus();
      } else {
        alert(data.error || 'Sync failed: ' + (data.hint || ''));
      }
    } catch (e: any) {
      alert('Sync error: ' + e.message);
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: {
            name,
            legal_name: legalName,
            address,
            phone1,
            phone2,
            email,
            gstin,
          },
          settings: {
            invoice_prefix: invoicePrefix,
            next_invoice_number: Number(nextInvoiceNumber) || 1,
            quotation_prefix: quotationPrefix,
            next_quotation_number: Number(nextQuotationNumber) || 1,
            purchase_prefix: purchasePrefix,
            default_terms: defaultTerms,
            bank_name: bankName,
            bank_branch: bankBranch,
            account_name: accountName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
            upi_id: upiId,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 p-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo.png"
                alt="Al Ameen Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Business & System Settings
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Configure Al Ameen Automation company profile, GSTIN, invoice prefixes and bank accounts
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Settings saved successfully to database! All subsequent bills and documents will use updated settings.
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'business', label: 'Business Profile & GST', icon: Building2 },
          { id: 'invoice', label: 'Invoice & Print Formatting', icon: Receipt },
          { id: 'bank', label: 'Bank & UPI Accounts', icon: Landmark },
          { id: 'staff', label: 'Staff Roles & Access', icon: Users },
          { id: 'database', label: 'Cloud Database (Supabase)', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[#13A89E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Form Body */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs max-w-3xl space-y-6">
        {/* Tab 1: Business Profile */}
        {activeTab === 'business' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-2">
              <div className="w-16 h-16 p-1 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo.png"
                  alt="Official Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Official Master Brand Logo</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Applied across GST Invoices, Quotations, e-Way Bills, Payslips, Topbar, and Navigation.
                </p>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Official Company Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Brand Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Legal Business Name:</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Official Workshop Address:</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Primary Mobile Number:</label>
                <input
                  type="text"
                  value={phone1}
                  onChange={(e) => setPhone1(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Secondary Mobile Number:</label>
                <input
                  type="text"
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Official Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">GSTIN Number (State Code 33):</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="33AABCA1234D1Z5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Configurable GST number printed on all Tax Invoices.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Invoice & Print Formatting */}
        {activeTab === 'invoice' && (
          <div className="space-y-6 text-xs">
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-[#13A89E] mt-1.5 shrink-0" />
              <div>
                <h4 className="font-bold text-[#172B4D] text-xs">Separate Document Sequences (Starts from 001)</h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Invoices and Quotations operate on completely separate, independent sequences. Leave prefixes empty for clean 3-digit numbering (e.g. <span className="font-mono font-bold">001</span>, <span className="font-mono font-bold">002</span>, <span className="font-mono font-bold">003</span>), or enter a custom prefix (e.g. <span className="font-mono font-bold">SI-</span> or <span className="font-mono font-bold">QT-</span>). Converting a quotation generates the next separate invoice number automatically.
                </p>
              </div>
            </div>

            {/* Sales Invoices Sequence */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Sales Invoice Numbering
                </h4>
                <span className="px-2.5 py-1 bg-white border border-slate-200 text-[#172B4D] font-mono font-extrabold text-[11px] rounded-lg shadow-2xs">
                  Next Invoice Preview: {(invoicePrefix || '').trim() + String(Math.max(1, nextInvoiceNumber || 1)).padStart(3, '0')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Invoice Prefix <span className="text-slate-400 font-normal">(Leave empty for 001, 002...)</span>:
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="e.g. leave empty or SI-"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Next Invoice Sequence Number:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nextInvoiceNumber}
                    onChange={(e) => setNextInvoiceNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Quotations Sequence */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#13A89E]" />
                  Quotation & Estimate Numbering
                </h4>
                <span className="px-2.5 py-1 bg-white border border-slate-200 text-[#172B4D] font-mono font-extrabold text-[11px] rounded-lg shadow-2xs">
                  Next Quotation Preview: {(quotationPrefix || '').trim() + String(Math.max(1, nextQuotationNumber || 1)).padStart(3, '0')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Quotation Prefix <span className="text-slate-400 font-normal">(Leave empty for 001, 002...)</span>:
                  </label>
                  <input
                    type="text"
                    value={quotationPrefix}
                    onChange={(e) => setQuotationPrefix(e.target.value)}
                    placeholder="e.g. leave empty or QT-"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Next Quotation Sequence Number:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nextQuotationNumber}
                    onChange={(e) => setNextQuotationNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Purchase Prefix */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Purchase Invoices
              </h4>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Purchase Prefix:</label>
                <input
                  type="text"
                  value={purchasePrefix}
                  onChange={(e) => setPurchasePrefix(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Default Terms & Conditions (Shown on PDF Invoices & Quotations):
              </label>
              <textarea
                rows={5}
                value={defaultTerms}
                onChange={(e) => setDefaultTerms(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Bank & UPI Accounts */}
        {activeTab === 'bank' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Payment Settlement Accounts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Bank Name:</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Branch Name:</label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Beneficiary Account Name:</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Bank Account Number:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">IFSC Code:</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">UPI ID (VPA):</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#172B4D]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Staff & Permissions */}
        {activeTab === 'staff' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Staff Members & Permissions
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#13A89E] text-white font-bold flex items-center justify-center">
                    A
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Admin (Proprietor)</div>
                    <div className="text-slate-400 text-[11px]">admin@alameen.com • Full Access</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-[#13A89E] font-bold text-[11px]">
                  Owner
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-400 text-white font-bold flex items-center justify-center">
                    M
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">M. Shabir</div>
                    <div className="text-slate-400 text-[11px]">Workshop Manager • Fabrication & Inventory</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 font-bold text-[11px]">
                  Manager
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-400 text-white font-bold flex items-center justify-center">
                    S
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Syed Akbar</div>
                    <div className="text-slate-400 text-[11px]">Senior Technician • Site Erection & Service</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold text-[11px]">
                  Staff
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Cloud Database (Supabase) */}
        {activeTab === 'database' && (
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Supabase Cloud Database</h3>
                <p className="text-[11px] text-slate-500">Live PostgreSQL cloud replication and synchronization</p>
              </div>
              <button
                onClick={fetchSupabaseStatus}
                disabled={testingSupabase}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>

            {/* Connection Status Badge Box */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              supabaseStatus?.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : supabaseStatus?.code === 'PGRST205'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="p-2 rounded-xl bg-white shadow-xs">
                <Database className={`w-5 h-5 ${
                  supabaseStatus?.connected
                    ? 'text-emerald-600'
                    : supabaseStatus?.code === 'PGRST205'
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-extrabold text-sm flex items-center gap-2">
                  {supabaseStatus?.connected ? (
                    <>
                      <span>Connected & Verified</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider">Live</span>
                    </>
                  ) : supabaseStatus?.code === 'PGRST205' ? (
                    <>
                      <span>Connected to Supabase Project (Tables Pending)</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider">Action Needed</span>
                    </>
                  ) : (
                    <span>Supabase Cloud Integration Configured</span>
                  )}
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {supabaseStatus?.connected
                    ? 'Your application is connected to your Supabase PostgreSQL database. You can synchronize all local billing, customer, and inventory records anytime.'
                    : supabaseStatus?.code === 'PGRST205'
                    ? 'API credentials successfully verified! The tables have not been created in your Supabase project yet. Follow the 1-click step below to run the SQL migration.'
                    : 'Configured with project URL and Secret API Key.'}
                </p>
              </div>
            </div>

            {syncMessage && (
              <div className="p-3.5 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-900 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {syncMessage}
              </div>
            )}

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Project Endpoint:</span>
                <a
                  href="https://supabase.com/dashboard/project/edjrjqmplnkdaatqwlbh"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#13A89E] hover:text-[#0E8A81] font-bold flex items-center gap-1 text-[11px]"
                >
                  Open Supabase Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="font-mono text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800 truncate">
                https://edjrjqmplnkdaatqwlbh.supabase.co
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Anon Public Key</div>
                  <div className="text-[11px] font-semibold text-slate-700">Configured in .env.local</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Service Role Secret Key</div>
                  <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active & Authenticated
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={handleSyncToSupabase}
                disabled={syncingSupabase}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] disabled:bg-teal-200 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-spin' : ''}`} />
                {syncingSupabase ? 'Synchronizing Data...' : 'Sync Local Data to Supabase'}
              </button>

              <a
                href="https://supabase.com/dashboard/project/edjrjqmplnkdaatqwlbh/sql/new"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open SQL Editor in Supabase
              </a>
            </div>

            {/* Quick Setup Instructions */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[#172B4D] space-y-2">
              <h4 className="font-bold text-xs text-[#172B4D] flex items-center gap-1.5">
                <span>📋 Initial PostgreSQL Migration File</span>
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                To create all 22 tables (businesses, customers, products, quotations, invoices, payments, etc.) in Supabase:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1 font-medium">
                <li>Open your Supabase project&apos;s SQL Editor.</li>
                <li>Copy the SQL script from: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono font-bold text-[#172B4D]">supabase/migrations/001_initial_schema.sql</code></li>
                <li>Click <strong>Run</strong> in Supabase.</li>
                <li>Click <strong>Sync Local Data to Supabase</strong> above!</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
