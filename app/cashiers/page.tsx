'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  UserCheck,
  UserPlus,
  KeyRound,
  Power,
  Activity,
  Calendar,
  Clock,
  FileText,
  Boxes,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';

interface CashierUser {
  id: string;
  full_name: string;
  email: string;
  username: string;
  phone?: string;
  role: string;
  is_active: number;
  last_login?: string;
  created_at: string;
}

export default function CashiersManagementPage() {
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    username: '',
    phone: '',
    password: '',
  });

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetCashier, setTargetCashier] = useState<CashierUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Activity Drawer
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const loadCashiers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cashiers');
      if (res.ok) {
        const data = await res.json();
        setCashiers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashiers();
  }, []);

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/cashiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create cashier');

      setCreateModalOpen(false);
      setCreateForm({ full_name: '', email: '', username: '', phone: '', password: '' });
      await loadCashiers();
    } catch (err: any) {
      setCreateError(err.message || 'Error creating cashier');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleStatus = async (cashier: CashierUser) => {
    const nextState = cashier.is_active === 1 ? false : true;
    const actionLabel = nextState ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} access for ${cashier.full_name}?`)) return;

    try {
      const res = await fetch(`/api/cashiers/${cashier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggle_status: true, is_active: nextState }),
      });
      if (res.ok) {
        await loadCashiers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenResetPassword = (cashier: CashierUser) => {
    setTargetCashier(cashier);
    setNewPassword('');
    setResetSuccess(false);
    setResetModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCashier || !newPassword) return;
    setResetSubmitting(true);

    try {
      const res = await fetch(`/api/cashiers/${targetCashier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');

      setResetSuccess(true);
      setTimeout(() => {
        setResetModalOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Error resetting password');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleOpenActivity = async (cashier: CashierUser) => {
    setTargetCashier(cashier);
    setActivityDrawerOpen(true);
    setActivityLoading(true);

    try {
      const res = await fetch(`/api/cashiers/${cashier.id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveActivity(data.activity);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActivityLoading(false);
    }
  };

  const filteredCashiers = cashiers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Cashier Account Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin control center: provision cashier terminal logins, toggle access, reset credentials, and monitor audit activity.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Cashier Account</span>
        </button>
      </div>

      {/* Search and Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cashier by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold self-end sm:self-auto">
          {cashiers.length} cashier accounts registered
        </span>
      </div>

      {/* Cashier Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-[#13A89E] border-t-transparent rounded-full animate-spin" />
            <span>Loading cashier accounts...</span>
          </div>
        ) : filteredCashiers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No cashier accounts found. Create one above to allow staff to log into the Cashier Portal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Cashier Name</th>
                  <th className="py-3.5 px-4">Username & Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCashiers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                          {c.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{c.full_name}</span>
                          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                            Cashier Role
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[#172B4D] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">
                        @{c.username}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{c.email}</span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {c.phone || '--'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {c.last_login ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.last_login}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Never logged in</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          c.is_active === 1
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        title="Click to toggle account activation"
                      >
                        <Power className="w-3 h-3" />
                        <span>{c.is_active === 1 ? 'Active' : 'Deactivated'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenActivity(c)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#13A89E] font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          title="View activity log"
                        >
                          <Activity className="w-3.5 h-3.5 text-[#13A89E]" />
                          <span>Activity</span>
                        </button>

                        <button
                          onClick={() => handleOpenResetPassword(c)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset Password</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Cashier Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">New Cashier Account</h3>
                  <p className="text-xs text-slate-500">Create login credentials for billing counter staff</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCashier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="e.g. Abdul Rahman"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="cashier2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="cashier2@alameen.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-6 py-2 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create Cashier Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && targetCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reset Password</h3>
                <p className="text-xs text-slate-500">For @{targetCashier.username} ({targetCashier.full_name})</p>
              </div>
            </div>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-center text-xs font-bold">
                ✓ Password successfully updated!
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {resetSubmitting ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Activity Drawer Modal */}
      {activityDrawerOpen && targetCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cashier Activity Audit Log</h3>
                  <p className="text-xs text-slate-500">Actions performed by @{targetCashier.username} ({targetCashier.full_name})</p>
                </div>
              </div>
              <button
                onClick={() => setActivityDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {activityLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading activity logs...
                </div>
              ) : (
                <>
                  {/* Sales Invoices Created */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#13A89E]" />
                      <span>Invoices Issued ({activeActivity?.invoices?.length || 0})</span>
                    </h4>
                    {!activeActivity?.invoices?.length ? (
                      <p className="text-xs text-slate-400 italic">No sales invoices issued by this cashier yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activeActivity.invoices.map((inv: any) => (
                          <div key={inv.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{inv.invoice_number}</span>
                              <span className="text-[10px] text-slate-400 block">{inv.issue_date}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-900">₹{Number(inv.grand_total).toLocaleString('en-IN')}</span>
                              <span className="text-[10px] font-bold uppercase text-emerald-600 block">{inv.payment_status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance Marked */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Daily Worker Attendance Marked ({activeActivity?.attendanceMarked?.length || 0})</span>
                    </h4>
                    {!activeActivity?.attendanceMarked?.length ? (
                      <p className="text-xs text-slate-400 italic">No attendance records logged by this cashier yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activeActivity.attendanceMarked.map((att: any) => (
                          <div key={att.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{att.employee_name} ({att.emp_code})</span>
                              <span className="text-[10px] text-slate-400 block">Date: {att.attendance_date}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                              {att.status} {att.check_in_time ? `(${att.check_in_time})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
