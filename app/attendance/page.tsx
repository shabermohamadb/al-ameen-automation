'use client';

import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Calendar,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  History,
  ShieldAlert,
  Search,
  Filter,
  CheckCheck,
} from 'lucide-react';

interface AttendanceRow {
  employee_id: string;
  emp_code: string;
  full_name: string;
  job_role: string;
  department: string;
  salary_type: string;
  base_salary: number;
  attendance_id?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'unmarked';
  check_in_time?: string;
  notes?: string;
  marked_by_name?: string;
  marked_at?: string;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [todayDate, setTodayDate] = useState<string>('');
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Correction Modal State (Admin only)
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRow | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceRow['status']>('present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionLoading, setCorrectionLoading] = useState(false);

  // Audit Logs Drawer State
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setTodayDate(today);

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const loadAttendance = async (dateStr: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/attendance?date=${dateStr}`);
      if (!res.ok) throw new Error('Failed to load attendance');
      const data = await res.json();
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'Error fetching attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadAttendance(selectedDate);
    }
  }, [selectedDate]);

  const handleStatusChange = (
    employeeId: string,
    newStatus: AttendanceRow['status']
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.employee_id !== employeeId) return row;
        let time = row.check_in_time;
        if (newStatus === 'present' && !time) time = '09:00 AM';
        if (newStatus === 'absent' || newStatus === 'leave') time = '';
        return {
          ...row,
          status: newStatus,
          check_in_time: time,
        };
      })
    );
  };

  const handleTimeChange = (employeeId: string, time: string) => {
    setRows((prev) =>
      prev.map((r) => (r.employee_id === employeeId ? { ...r, check_in_time: time } : r))
    );
  };

  const handleNotesChange = (employeeId: string, notes: string) => {
    setRows((prev) =>
      prev.map((r) => (r.employee_id === employeeId ? { ...r, notes } : r))
    );
  };

  const handleMarkAllPresent = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'present',
        check_in_time: r.check_in_time || '09:00 AM',
      }))
    );
  };

  const handleSaveBatch = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const recordsToSave = rows.map((r) => ({
        employee_id: r.employee_id,
        status: r.status === 'unmarked' ? 'present' : r.status,
        check_in_time: r.check_in_time,
        notes: r.notes,
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: recordsToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save attendance');

      setSaveSuccess(true);
      await loadAttendance(selectedDate);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCorrection = (row: AttendanceRow) => {
    setCorrectionTarget(row);
    setCorrectionStatus(row.status === 'unmarked' ? 'present' : row.status);
    setCorrectionReason('');
  };

  const handleSaveCorrection = async () => {
    if (!correctionTarget?.attendance_id) {
      alert('This employee does not have a saved attendance record for this date yet. Use Save Attendance first.');
      return;
    }
    if (!correctionReason.trim()) {
      alert('A valid reason for the correction is mandatory for audit compliance.');
      return;
    }

    try {
      setCorrectionLoading(true);
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: correctionTarget.attendance_id,
          new_status: correctionStatus,
          reason: correctionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update record');

      setCorrectionTarget(null);
      await loadAttendance(selectedDate);
    } catch (e: any) {
      alert(e.message || 'Correction failed');
    } finally {
      setCorrectionLoading(false);
    }
  };

  const handleOpenAuditLogs = async () => {
    setAuditLogsOpen(true);
    try {
      const res = await fetch('/api/attendance/audit');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.emp_code.toLowerCase().includes(search.toLowerCase()) ||
      r.job_role.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || r.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const presentCount = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
  const absentCount = rows.filter((r) => r.status === 'absent').length;
  const halfDayCount = rows.filter((r) => r.status === 'half_day').length;
  const leaveCount = rows.filter((r) => r.status === 'leave').length;

  const isToday = !selectedDate || selectedDate === todayDate;
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily Employee Attendance</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Every morning, Cashier or Admin marks attendance for all active employees, fabricators, and workers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleOpenAuditLogs}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <History className="w-4 h-4 text-[#13A89E]" />
              <span>Audit History</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Calendar className="w-4 h-4 text-[#13A89E] shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleMarkAllPresent}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Mark All Present</span>
          </button>

          <button
            onClick={handleSaveBatch}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
              saving
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-[#13A89E] hover:bg-[#0E8A81] shadow-teal-900/10'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Daily attendance records successfully saved and verified in the database!</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
            <p className="text-xl font-black text-slate-800">{rows.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
            {rows.length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Present</span>
            <p className="text-xl font-black text-emerald-700">{presentCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-red-200/80 bg-red-50/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Absent</span>
            <p className="text-xl font-black text-red-700">{absentCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Half-Day (0.5)</span>
            <p className="text-xl font-black text-blue-700">{halfDayCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">On Leave</span>
            <p className="text-xl font-black text-slate-700">{leaveCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search worker by name, code or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Departments</option>
            <option value="Workshop">Workshop</option>
            <option value="Field Installation">Field Installation</option>
            <option value="Billing & Accounts">Billing & Accounts</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-[#13A89E] border-t-transparent rounded-full animate-spin" />
            <span>Loading employee roster for {selectedDate}...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No employees match the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Check-in</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                  <th className="py-3 px-4 text-right">Audited By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.employee_id} className="hover:bg-slate-50/60 transition">
                    {/* Worker Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{row.full_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-[#172B4D] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {row.emp_code}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {row.salary_type === 'daily' ? 'Daily Wage' : 'Monthly Salary'}
                        </span>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{row.job_role}</div>
                      <div className="text-[11px] text-slate-400">{row.department}</div>
                    </td>

                    {/* Status Pill Toggle Buttons */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(row.employee_id, 'present')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                            row.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-white/50'
                          }`}
                        >
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(row.employee_id, 'late')}
                          className={`px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                            row.status === 'late'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-white/50'
                          }`}
                        >
                          Late
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(row.employee_id, 'half_day')}
                          className={`px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                            row.status === 'half_day'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-blue-700 hover:bg-white/50'
                          }`}
                        >
                          Half (0.5)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(row.employee_id, 'leave')}
                          className={`px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                            row.status === 'leave'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                          }`}
                        >
                          Leave
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(row.employee_id, 'absent')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                            row.status === 'absent'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-red-700 hover:bg-white/50'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>

                    {/* Check In Time */}
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        value={row.check_in_time || ''}
                        placeholder="--:-- --"
                        onChange={(e) => handleTimeChange(row.employee_id, e.target.value)}
                        className="w-24 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#13A89E] font-mono"
                      />
                    </td>

                    {/* Remarks */}
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        value={row.notes || ''}
                        placeholder="Add notes..."
                        onChange={(e) => handleNotesChange(row.employee_id, e.target.value)}
                        className="w-full max-w-xs px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#13A89E]"
                      />
                    </td>

                    {/* Marked By & Admin Action */}
                    <td className="py-3.5 px-4 text-right">
                      {row.marked_by_name ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 font-medium">
                            By {row.marked_by_name}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenCorrection(row)}
                              className="text-[10px] font-bold text-[#13A89E] hover:text-[#0E8A81] underline mt-0.5 cursor-pointer"
                            >
                              Audit Correct
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Not saved yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Attendance Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Admin Attendance Correction</h3>
                <p className="text-xs text-slate-500">Every edit is permanently recorded in the audit log</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs">
              <div className="font-bold text-slate-800">{correctionTarget.full_name} ({correctionTarget.emp_code})</div>
              <div className="text-slate-500">Date: {selectedDate} | Current Status: <strong className="uppercase">{correctionTarget.status}</strong></div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['present', 'late', 'half_day', 'absent', 'leave'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCorrectionStatus(st)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold capitalize transition border cursor-pointer ${
                        correctionStatus === st
                          ? 'bg-[#13A89E] text-white border-[#13A89E] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st === 'half_day' ? 'Half-Day' : st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Correction <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Employee arrived with medical slip, supervisor verified site erection work..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setCorrectionTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={correctionLoading}
                onClick={handleSaveCorrection}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#13A89E] hover:bg-[#0E8A81] shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {correctionLoading ? 'Logging & Saving...' : 'Save Audited Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Audit History Drawer Modal */}
      {auditLogsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Attendance Audit Log</h3>
                  <p className="text-xs text-slate-500">Tamper-evident record of all historical attendance modifications</p>
                </div>
              </div>
              <button
                onClick={() => setAuditLogsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No attendance correction audits recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{log.employee_name} ({log.emp_code})</span>
                      <span className="text-[11px] text-slate-400 font-mono">{log.created_at}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500">Date: {log.attendance_date}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">{log.previous_status}</span>
                      <span>&rarr;</span>
                      <span className="text-[10px] font-bold uppercase text-[#13A89E]">{log.new_status}</span>
                    </div>
                    <p className="mt-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-100 italic">
                      &ldquo;{log.reason}&rdquo;
                    </p>
                    <div className="mt-1.5 text-[10px] text-slate-400">
                      Changed by: <strong className="text-slate-600">{log.changed_by_name}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
