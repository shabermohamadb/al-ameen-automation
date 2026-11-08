'use client';

import React, { useEffect, useState } from 'react';
import {
  Banknote,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  FileText,
  UserCheck,
  TrendingDown,
  CreditCard,
  Printer,
  ChevronRight,
  Receipt,
  Search,
} from 'lucide-react';

interface EmployeeSummary {
  employee_id: string;
  emp_code: string;
  full_name: string;
  job_role: string;
  department: string;
  salary_type: 'monthly' | 'daily' | 'hourly';
  base_salary: number;
  total_days_in_month: number;
  days_present: number;
  days_late: number;
  days_half_day: number;
  days_absent: number;
  days_leave: number;
  effective_days: number;
  unmarked_days: number;
}

export default function SalaryPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payroll' | 'payments' | 'advances'>('payroll');

  // Disbursal Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedEmpCalc, setSelectedEmpCalc] = useState<any>(null);
  const [allowances, setAllowances] = useState<number>(0);
  const [bonuses, setBonuses] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [advanceDeduct, setAdvanceDeduct] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Issue Advance Modal State
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceTargetEmpId, setAdvanceTargetEmpId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  // Payslip Preview Modal State
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [activePayslip, setActivePayslip] = useState<any>(null);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Load attendance summary for the month
      const sumRes = await fetch(`/api/attendance/summary?month=${selectedMonth}&year=${selectedYear}`);
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setEmployees(sumData);
      }

      // 2. Load payments for the month
      const payRes = await fetch(`/api/salary?month=${selectedMonth}&year=${selectedYear}`);
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData);
      }

      // 3. Load active advances
      const advRes = await fetch('/api/salary/advances');
      if (advRes.ok) {
        const advData = await advRes.json();
        setAdvances(advData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Open Disbursal Modal with dynamic calculation
  const handleOpenDisbursal = async (employeeId: string) => {
    try {
      const res = await fetch(`/api/salary/calculate?employeeId=${employeeId}&month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to calculate salary');
      const calc = await res.json();

      setSelectedEmpCalc(calc);
      setAllowances(0);
      setBonuses(0);
      setDeductions(0);
      // Default to recovering up to outstanding advance or earned salary
      const maxAdvRecover = Math.min(calc.outstanding_advance || 0, calc.earned_salary || 0);
      setAdvanceDeduct(maxAdvRecover);
      const initialNet = Math.max(0, calc.earned_salary - maxAdvRecover);
      setPaidAmount(initialNet);
      setPaymentMode('Cash');
      setPaymentNotes('');
      setPaymentModalOpen(true);
    } catch (e: any) {
      alert(e.message || 'Error opening payment dialog');
    }
  };

  // Re-calculate net payable inside modal
  const computedEarned = Number(selectedEmpCalc?.earned_salary || 0);
  const computedNetPayable = Math.max(
    0,
    computedEarned + Number(allowances || 0) + Number(bonuses || 0) - Number(deductions || 0) - Number(advanceDeduct || 0)
  );

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpCalc) return;
    setSubmittingPayment(true);

    try {
      const payload = {
        employee_id: selectedEmpCalc.employee.id,
        period_month: selectedMonth,
        period_year: selectedYear,
        salary_type: selectedEmpCalc.salary_type,
        base_rate: selectedEmpCalc.base_salary,
        total_days_in_month: selectedEmpCalc.total_days_in_month,
        days_present: selectedEmpCalc.days_present,
        days_absent: selectedEmpCalc.days_absent,
        days_half_day: selectedEmpCalc.days_half_day,
        days_leave: selectedEmpCalc.days_leave,
        earned_salary: computedEarned,
        allowances: Number(allowances || 0),
        bonuses: Number(bonuses || 0),
        deductions: Number(deductions || 0),
        advance_deducted: Number(advanceDeduct || 0),
        net_payable: computedNetPayable,
        paid_amount: Number(paidAmount || 0),
        payment_mode: paymentMode,
        payment_date: new Date().toISOString().split('T')[0],
        notes: paymentNotes,
      };

      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record salary payment');

      setPaymentModalOpen(false);
      await loadData();
      // Show payslip preview directly
      setActivePayslip(data);
      setPayslipModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleIssueAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceTargetEmpId || !advanceAmount) return;
    setSubmittingAdvance(true);

    try {
      const res = await fetch('/api/salary/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: advanceTargetEmpId,
          amount: Number(advanceAmount),
          notes: advanceNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue advance');

      setAdvanceModalOpen(false);
      setAdvanceAmount('');
      setAdvanceNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error issuing advance');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Check which employees already received payment this month
  const paymentMap = new Map();
  for (const p of payments) {
    paymentMap.set(p.employee_id, p);
  }

  const totalDisbursedThisMonth = payments.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const totalOpenAdvances = advances
    .filter((a) => a.status === 'open')
    .reduce((acc, a) => acc + Number(a.balance_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Salary & Payroll Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendance-driven payroll: automatic wage calculation from worker check-ins, advance deductions, and payslips.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month & Year Selectors */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold">
            <Calendar className="w-4 h-4 text-[#13A89E] shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer ml-1"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setAdvanceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <TrendingDown className="w-4 h-4 text-amber-600" />
            <span>Issue Salary Advance</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payroll Month</span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
          </div>
          <span className="text-[11px] text-[#13A89E] font-semibold">{employees.length} workers on payroll</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Paid This Month</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{totalDisbursedThisMonth.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">{payments.length} disbursed payslips</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outstanding Advances</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            ₹{totalOpenAdvances.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">To recover from wages</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Status</span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {payments.length} / {employees.length} Settled
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {employees.length - payments.length} pending disbursal
          </span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'payroll'
              ? 'bg-[#13A89E] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Attendance-Based Calculation ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-[#13A89E] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Disbursed Payslips ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'advances'
              ? 'bg-[#13A89E] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Salary Advances & Loans ({advances.length})
        </button>
      </div>

      {/* Main Tab 1: Attendance-based Calculation Table */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#13A89E] border-t-transparent rounded-full animate-spin" />
              <span>Calculating attendance and wages...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No active employees found. Add employees in the Employee Management section.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Wage Structure</th>
                    <th className="py-3 px-4 text-center">Attendance Breakdown</th>
                    <th className="py-3 px-4 text-center">Effective Days</th>
                    <th className="py-3 px-4">Earned Wages</th>
                    <th className="py-3 px-4">Payroll Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const daysInMonth = emp.total_days_in_month || 30;
                    let earned = 0;
                    if (emp.salary_type === 'monthly') {
                      earned = Math.round((emp.base_salary / daysInMonth) * emp.effective_days);
                    } else if (emp.salary_type === 'daily') {
                      earned = Math.round(emp.base_salary * emp.effective_days);
                    } else {
                      earned = Math.round(emp.base_salary * 8 * emp.effective_days);
                    }

                    const existingPayment = paymentMap.get(emp.employee_id);

                    return (
                      <tr key={emp.employee_id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{emp.full_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-[#172B4D] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {emp.emp_code}
                            </span>
                            <span className="text-[11px] text-slate-500">{emp.job_role}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-800">
                            ₹{Number(emp.base_salary).toLocaleString('en-IN')}
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                              / {emp.salary_type === 'monthly' ? 'mo' : 'day'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#13A89E] capitalize font-semibold">
                            {emp.salary_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1 text-[11px]">
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold" title="Present">
                              {emp.days_present + emp.days_late}P
                            </span>
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold" title="Half-day">
                              {emp.days_half_day}H
                            </span>
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-bold" title="Absent">
                              {emp.days_absent}A
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-bold" title="Leave">
                              {emp.days_leave}L
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-black text-slate-900 text-sm">{emp.effective_days}</span>
                          <span className="text-[10px] text-slate-400 block">/ {emp.total_days_in_month} days</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 text-sm">
                            ₹{earned.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-slate-500">Calculated</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {existingPayment ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                Paid: ₹{Number(existingPayment.paid_amount).toLocaleString('en-IN')}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {existingPayment.payment_number}
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                              Ready for Disbursal
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {existingPayment ? (
                            <button
                              onClick={() => {
                                setActivePayslip(existingPayment);
                                setPayslipModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#13A89E] font-bold text-xs rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Payslip</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDisbursal(emp.employee_id)}
                              className="px-3.5 py-1.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Tab 2: Disbursed Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No salary payments disbursed yet for {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Days Worked</th>
                    <th className="py-3 px-4">Net Payable</th>
                    <th className="py-3 px-4">Paid Amount</th>
                    <th className="py-3 px-4">Mode & Date</th>
                    <th className="py-3 px-4 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#172B4D]">{p.payment_number}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.employee_name}</div>
                        <div className="text-[10px] text-slate-400">{p.emp_code} &bull; {p.job_role}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{p.days_present} days</span>
                        {p.days_half_day > 0 && <span className="text-slate-500"> ({p.days_half_day} half)</span>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">₹{Number(p.net_payable).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">₹{Number(p.paid_amount).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">{p.payment_mode}</span>
                        <div className="text-[10px] text-slate-400">{p.payment_date}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setActivePayslip(p);
                            setPayslipModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-teal-50 text-[#13A89E] hover:bg-teal-100 font-bold rounded-lg text-xs transition"
                        >
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Tab 3: Salary Advances & Loans */}
      {activeTab === 'advances' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {advances.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No salary advances recorded. Use &quot;Issue Salary Advance&quot; above to issue loan advances.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Advance Date</th>
                    <th className="py-3 px-4">Total Advance</th>
                    <th className="py-3 px-4">Recovered so far</th>
                    <th className="py-3 px-4">Remaining Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{adv.employee_name}</div>
                        <span className="font-mono text-[10px] text-[#172B4D] font-bold">{adv.emp_code}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{adv.advance_date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">₹{Number(adv.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">₹{Number(adv.recovered_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-black text-amber-600">₹{Number(adv.balance_amount).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          adv.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {adv.status === 'open' ? 'Pending Recovery' : 'Recovered'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic">{adv.notes || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Disbursal Modal */}
      {paymentModalOpen && selectedEmpCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Disburse Worker Wages</h3>
                  <p className="text-xs text-slate-500">
                    {months.find((m) => m.value === selectedMonth)?.label} {selectedYear} &bull; {selectedEmpCalc.employee.full_name} ({selectedEmpCalc.employee.emp_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Attendance & Wage Computed Breakdown */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Wage Type & Base Rate:</span>
                <span className="font-bold text-slate-900">
                  ₹{Number(selectedEmpCalc.base_salary).toLocaleString('en-IN')} / {selectedEmpCalc.salary_type === 'monthly' ? 'month' : 'day'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Attendance Verified:</span>
                <span className="font-bold text-slate-900">
                  {selectedEmpCalc.effective_days} effective days (Present: {selectedEmpCalc.days_present}, Half: {selectedEmpCalc.days_half_day}, Absent: {selectedEmpCalc.days_absent})
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 font-bold pt-1 border-t border-slate-200">
                <span>Earned Base Salary:</span>
                <span className="text-sm font-black text-[#172B4D]">₹{computedEarned.toLocaleString('en-IN')}</span>
              </div>
              {selectedEmpCalc.outstanding_advance > 0 && (
                <div className="flex justify-between items-center text-amber-700 font-semibold pt-1">
                  <span>Open Advance Balance:</span>
                  <span>₹{selectedEmpCalc.outstanding_advance.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Overtime / Allowances (+₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={allowances}
                    onChange={(e) => setAllowances(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#13A89E] focus:border-[#13A89E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bonus (+₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={bonuses}
                    onChange={(e) => setBonuses(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#13A89E] focus:border-[#13A89E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deductions (-₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#13A89E] focus:border-[#13A89E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1">Deduct Advance (-₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedEmpCalc.outstanding_advance || 0}
                    value={advanceDeduct}
                    onChange={(e) => setAdvanceDeduct(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Net Payable Highlight */}
              <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#13A89E]">Total Net Payable</span>
                  <div className="text-2xl font-black text-[#172B4D]">
                    ₹{computedNetPayable.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="w-40">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Amount Disbursing Now</label>
                  <input
                    type="number"
                    min="0"
                    max={computedNetPayable}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-teal-300 rounded-xl text-xs font-black text-[#172B4D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Cleared monthly wages"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-6 py-2 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? 'Processing...' : 'Confirm Disbursal & Print Payslip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Advance Modal */}
      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Issue Worker Salary Advance</h3>
                <p className="text-xs text-slate-500">Loan advance automatically tracks for next wage recovery</p>
              </div>
            </div>

            <form onSubmit={handleIssueAdvance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={advanceTargetEmpId}
                  onChange={(e) => setAdvanceTargetEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Worker --</option>
                  {employees.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.full_name} ({e.emp_code}) - {e.job_role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Advance Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  step="50"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="e.g. Festival advance, emergency medical..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvance}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submittingAdvance ? 'Recording...' : 'Disburse Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {payslipModalOpen && activePayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-100 my-8">
            {/* Header */}
            <div className="text-center border-b border-slate-200 pb-4 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo.png"
                alt="Al Ameen Logo"
                className="w-12 h-12 object-contain mx-auto mb-2"
              />
              <h2 className="text-xl font-black text-slate-900">AL AMEEN AUTOMATION</h2>
              <p className="text-xs text-slate-500 font-medium">13-A, Omalur Main Road, Salem &bull; GSTIN: 33CRHPD7107H1Z3</p>
              <div className="mt-2 inline-block px-3 py-1 bg-teal-50 text-[#13A89E] rounded-full text-xs font-bold uppercase tracking-wider border border-teal-200">
                Salary Payslip Voucher &bull; {months.find((m) => m.value === (activePayslip.period_month || selectedMonth))?.label} {activePayslip.period_year || selectedYear}
              </div>
            </div>

            {/* Voucher Meta */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Voucher Number</span>
                <span className="font-mono font-bold text-slate-800">{activePayslip.payment_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Date & Mode</span>
                <span className="font-semibold text-slate-800">{activePayslip.payment_date} ({activePayslip.payment_mode})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee Name & Code</span>
                <span className="font-bold text-slate-900">{activePayslip.employee_name} ({activePayslip.emp_code})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Role & Department</span>
                <span className="font-semibold text-slate-800">{activePayslip.job_role} &bull; {activePayslip.department}</span>
              </div>
            </div>

            {/* Attendance Days */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4 flex justify-around text-center">
              <div>
                <span className="text-slate-500 block text-[10px]">Total Days</span>
                <span className="font-bold text-slate-800">{activePayslip.total_days_in_month || 30}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Days Present</span>
                <span className="font-bold text-emerald-700">{activePayslip.days_present}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Half-Day</span>
                <span className="font-bold text-blue-700">{activePayslip.days_half_day}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Days Absent</span>
                <span className="font-bold text-red-700">{activePayslip.days_absent}</span>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="space-y-2 text-xs border-b border-slate-200 pb-4 mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Base Rate:</span>
                <span className="font-semibold text-slate-800">₹{Number(activePayslip.base_rate).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Earned Gross Salary:</span>
                <span className="font-bold text-slate-900">₹{Number(activePayslip.earned_salary).toLocaleString('en-IN')}</span>
              </div>
              {Number(activePayslip.allowances || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Allowances:</span>
                  <span>+₹{Number(activePayslip.allowances).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(activePayslip.bonuses || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Bonus:</span>
                  <span>+₹{Number(activePayslip.bonuses).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(activePayslip.deductions || 0) > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>Deductions:</span>
                  <span>-₹{Number(activePayslip.deductions).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(activePayslip.advance_deducted || 0) > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Advance Deducted:</span>
                  <span>-₹{Number(activePayslip.advance_deducted).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Disbursed:</span>
                <span className="text-[#13A89E] text-lg font-black">₹{Number(activePayslip.paid_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs text-slate-500">
              <div>
                <div className="border-b border-slate-300 w-36 mx-auto mb-1" />
                <span>Employee Signature</span>
              </div>
              <div>
                <div className="border-b border-slate-300 w-36 mx-auto mb-1" />
                <span>Authorised Signatory</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={() => setPayslipModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
