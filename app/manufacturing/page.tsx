'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  MapPin,
  Ruler,
  X,
} from 'lucide-react';
import { formatINR } from '@/lib/gst';

const JOB_STATUSES = [
  'All',
  'New Order',
  'Quotation Approved',
  'Materials Pending',
  'Manufacturing',
  'Ready for Installation',
  'Installation Completed',
  'Delivered',
  'Cancelled',
];

export default function ManufacturingPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Job Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [shutterType, setShutterType] = useState('Box Profile Heavy Duty (14x12 ft)');
  const [materialType, setMaterialType] = useState('18 Gauge CR Steel');
  const [width, setWidth] = useState(14);
  const [height, setHeight] = useState(12);
  const [siteAddress, setSiteAddress] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('M. Shabir & Team');
  const [targetDate, setTargetDate] = useState('2026-11-15');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobRes, cRes] = await Promise.all([
        fetch('/api/manufacturing'),
        fetch('/api/customers'),
      ]);
      const [jobData, cData] = await Promise.all([jobRes.json(), cRes.json()]);

      if (jobData.success) setJobs(jobData.data);
      if (cData.success) {
        setCustomers(cData.data);
        if (cData.data.length > 0 && !customerId) setCustomerId(cData.data[0].id);
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

  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/manufacturing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleSaveJob = async () => {
    if (!customerId || !shutterType) {
      alert('Customer and Shutter Type are required');
      return;
    }

    try {
      const res = await fetch('/api/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          shutter_type: shutterType,
          material_type: materialType,
          width,
          height,
          area_sqft: width * height,
          site_address: siteAddress,
          assigned_staff: assignedStaff,
          start_date: new Date().toISOString().split('T')[0],
          expected_completion_date: targetDate,
          status: 'Manufacturing',
          notes,
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

  const filteredJobs = jobs.filter((j) => {
    const matchesStatus = activeStatus === 'All' || j.status === activeStatus;
    const matchesSearch =
      j.job_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.shutter_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#13A89E] rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Manufacturing & Workshop Job Cards
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Track rolling shutter orders from quotation approval, leaf slat assembly to delivery
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Create Job Card
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {JOB_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setActiveStatus(st)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                activeStatus === st
                  ? 'bg-[#13A89E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job number, client, profile..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#13A89E] focus:outline-none"
          />
        </div>
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-slate-400">Loading job cards...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-slate-400">
            No manufacturing job cards found for this filter.
          </div>
        ) : (
          filteredJobs.map((job) => {
            let statusBadge = 'bg-teal-50 text-[#13A89E]';
            if (job.status === 'Ready for Installation') statusBadge = 'bg-amber-100 text-amber-800';
            if (job.status === 'Installation Completed' || job.status === 'Delivered')
              statusBadge = 'bg-emerald-100 text-emerald-800';

            return (
              <div
                key={job.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#13A89E] bg-teal-50 px-2.5 py-1 rounded-lg">
                      {job.job_number}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${statusBadge}`}>
                      {job.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {job.shutter_type}
                    </h4>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Customer: <span className="font-semibold text-slate-800">{job.customer_name}</span>
                    </div>
                  </div>

                  {/* Dimensions & Specs Box */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-[#13A89E]" /> Dimensions:
                      </span>
                      <span className="font-bold text-slate-900">
                        {job.width} ft × {job.height} ft ({job.area_sqft} sqft)
                      </span>
                    </div>
                    {job.material_type && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Material:</span>
                        <span className="font-medium text-slate-800">{job.material_type}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Assigned:
                      </span>
                      <span className="font-medium text-slate-800">{job.assigned_staff || 'Staff'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Date:
                      </span>
                      <span className="font-bold text-[#172B4D]">{job.expected_completion_date || 'TBD'}</span>
                    </div>
                  </div>

                  {job.site_address && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{job.site_address}</span>
                    </div>
                  )}
                </div>

                {/* Status Switcher Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Update Stage:</span>
                  <select
                    value={job.status}
                    onChange={(e) => handleUpdateStatus(job.id, e.target.value)}
                    className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700"
                  >
                    {JOB_STATUSES.filter((s) => s !== 'All').map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create Manufacturing Job Card</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Customer:</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
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
                <label className="block font-semibold text-slate-600 mb-1">Shutter Description / Type:</label>
                <input
                  type="text"
                  value={shutterType}
                  onChange={(e) => setShutterType(e.target.value)}
                  placeholder="e.g. Heavy Box Profile Shutter with Center Motor"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Width (ft):</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Height (ft):</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Material / Slat Specification:</label>
                <input
                  type="text"
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  placeholder="e.g. 18 Gauge Galvanized Strip"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Installation Site Address:</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. Kadayapatti Bazaar Shop 12"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Assigned Fabricator:</label>
                  <input
                    type="text"
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Target Completion Date:</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
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
                onClick={handleSaveJob}
                className="px-6 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Create Job Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
