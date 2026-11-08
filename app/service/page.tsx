'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Wrench,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  Clock,
  Phone,
  X,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

export default function InstallationAndServicePage() {
  const [activeTab, setActiveTab] = useState<'installations' | 'services'>('installations');
  const [installations, setInstallations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showInstModal, setShowInstModal] = useState(false);
  const [showSrvModal, setShowSrvModal] = useState(false);

  // Installation Form
  const [instCustomerId, setInstCustomerId] = useState('');
  const [instSite, setInstSite] = useState('');
  const [instTechnician, setInstTechnician] = useState('Syed Akbar');
  const [instDate, setInstDate] = useState('2026-11-07');
  const [instCharges, setInstCharges] = useState<number>(2500);
  const [instNotes, setInstNotes] = useState('');

  // Service Form
  const [srvCustomerId, setSrvCustomerId] = useState('');
  const [srvProduct, setSrvProduct] = useState('Single Phase Shutter Center Motor 600kg');
  const [srvIssue, setSrvIssue] = useState('Motor humming sound, limit switch needs adjustment');
  const [srvTechnician, setSrvTechnician] = useState('Farooq');
  const [srvVisitDate, setSrvVisitDate] = useState('2026-11-07');
  const [srvCharges, setSrvCharges] = useState<number>(1200);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [iRes, sRes, cRes] = await Promise.all([
        fetch('/api/installations'),
        fetch('/api/services'),
        fetch('/api/customers'),
      ]);
      const [iData, sData, cData] = await Promise.all([iRes.json(), sRes.json(), cRes.json()]);

      if (iData.success) setInstallations(iData.data);
      if (sData.success) setServices(sData.data);
      if (cData.success) {
        setCustomers(cData.data);
        if (cData.data.length > 0) {
          setInstCustomerId(cData.data[0].id);
          setSrvCustomerId(cData.data[0].id);
        }
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

  const handleSaveInstallation = async () => {
    if (!instCustomerId || !instTechnician) {
      alert('Customer and technician are required');
      return;
    }

    try {
      const res = await fetch('/api/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: instCustomerId,
          site_address: instSite || 'Salem Site',
          technician_name: instTechnician,
          scheduled_date: instDate,
          service_charges: instCharges,
          status: 'Scheduled',
          notes: instNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInstModal(false);
        fetchData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleSaveService = async () => {
    if (!srvCustomerId || !srvProduct || !srvIssue) {
      alert('Customer, Product, and Issue details are required');
      return;
    }

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: srvCustomerId,
          product_name: srvProduct,
          issue_description: srvIssue,
          technician_name: srvTechnician,
          visit_date: srvVisitDate,
          service_charges: srvCharges,
          status: 'Technician Assigned',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSrvModal(false);
        fetchData();
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
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Installation & Service Operations
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Dispatch technicians for on-site shutter installation, motor repairs and annual maintenance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'installations' ? (
            <button
              onClick={() => setShowInstModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              Book Installation
            </button>
          ) : (
            <button
              onClick={() => setShowSrvModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              Raise Service Ticket
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('installations')}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'installations'
                ? 'bg-[#13A89E] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Installation Bookings ({installations.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'services'
                ? 'bg-[#13A89E] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Service & Maintenance ({services.length})
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {activeTab === 'installations' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Site Address</th>
                  <th className="py-3.5 px-4">Technician</th>
                  <th className="py-3.5 px-4">Scheduled Date</th>
                  <th className="py-3.5 px-4 text-right">Fitting Charges</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading installations...
                    </td>
                  </tr>
                ) : installations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No installation bookings logged yet.
                    </td>
                  </tr>
                ) : (
                  installations.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inst.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{inst.customer_phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">
                        {inst.site_address}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#172B4D]">
                        {inst.technician_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{inst.scheduled_date}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(inst.service_charges)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700">
                          {inst.status}
                        </span>
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
                  <th className="py-3.5 px-4">Ticket #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Equipment / Motor</th>
                  <th className="py-3.5 px-4">Issue Reported</th>
                  <th className="py-3.5 px-4">Technician</th>
                  <th className="py-3.5 px-4">Visit Date</th>
                  <th className="py-3.5 px-4 text-right">Service Charges</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading service requests...
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No service requests logged yet.
                    </td>
                  </tr>
                ) : (
                  services.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {srv.ticket_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{srv.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{srv.customer_phone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {srv.product_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">
                        {srv.issue_description}
                      </td>
                      <td className="py-3.5 px-4 text-[#172B4D] font-semibold">
                        {srv.technician_name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{srv.visit_date || '-'}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(srv.service_charges)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-[#13A89E]">
                          {srv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Installation Modal */}
      {showInstModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Book Installation Visit</h3>
              <button onClick={() => setShowInstModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Customer:</label>
                <select
                  value={instCustomerId}
                  onChange={(e) => setInstCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Site Address:</label>
                <input
                  type="text"
                  value={instSite}
                  onChange={(e) => setInstSite(e.target.value)}
                  placeholder="e.g. 124 Meyyanur Main Road, Salem"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Lead Technician:</label>
                  <input
                    type="text"
                    value={instTechnician}
                    onChange={(e) => setInstTechnician(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Scheduled Date:</label>
                  <input
                    type="date"
                    value={instDate}
                    onChange={(e) => setInstDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Fitting Charges (₹):</label>
                <input
                  type="number"
                  value={instCharges}
                  onChange={(e) => setInstCharges(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowInstModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInstallation}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Schedule Installation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Service Ticket Modal */}
      {showSrvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Raise Service & Repair Ticket</h3>
              <button onClick={() => setShowSrvModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Customer:</label>
                <select
                  value={srvCustomerId}
                  onChange={(e) => setSrvCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Equipment / Motor Description:</label>
                <input
                  type="text"
                  value={srvProduct}
                  onChange={(e) => setSrvProduct(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Issue Reported:</label>
                <textarea
                  rows={2}
                  value={srvIssue}
                  onChange={(e) => setSrvIssue(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Technician:</label>
                  <input
                    type="text"
                    value={srvTechnician}
                    onChange={(e) => setSrvTechnician(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Visit Date:</label>
                  <input
                    type="date"
                    value={srvVisitDate}
                    onChange={(e) => setSrvVisitDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Service Charges (₹):</label>
                <input
                  type="number"
                  value={srvCharges}
                  onChange={(e) => setSrvCharges(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowSrvModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveService}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Create Service Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
