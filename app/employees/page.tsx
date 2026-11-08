'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  IndianRupee,
  Briefcase,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';

interface Employee {
  id: string;
  emp_code: string;
  full_name: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  job_role: string;
  department: string;
  joining_date: string;
  employment_type: string;
  salary_type: 'monthly' | 'daily' | 'hourly';
  base_salary: number;
  employment_status: 'active' | 'inactive' | 'terminated';
  notes?: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    emp_code: '',
    full_name: '',
    phone: '',
    alternate_phone: '',
    address: '',
    job_role: 'Welder / Fabricator',
    department: 'Workshop',
    joining_date: '2024-01-01',
    employment_type: 'full_time',
    salary_type: 'daily',
    base_salary: '850',
    employment_status: 'active',
    notes: '',
  });

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      emp_code: '',
      full_name: '',
      phone: '',
      alternate_phone: '',
      address: '',
      job_role: 'Welder / Fabricator',
      department: 'Workshop',
      joining_date: new Date().toISOString().split('T')[0],
      employment_type: 'full_time',
      salary_type: 'daily',
      base_salary: '850',
      employment_status: 'active',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      emp_code: emp.emp_code,
      full_name: emp.full_name,
      phone: emp.phone,
      alternate_phone: emp.alternate_phone || '',
      address: emp.address || '',
      job_role: emp.job_role,
      department: emp.department,
      joining_date: emp.joining_date,
      employment_type: emp.employment_type,
      salary_type: emp.salary_type,
      base_salary: String(emp.base_salary),
      employment_status: emp.employment_status,
      notes: emp.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
      const method = editingEmployee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          base_salary: Number(formData.base_salary || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save employee details');

      setIsModalOpen(false);
      await loadEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Error saving employee');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate or remove employee "${name}"?`)) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove employee');
      await loadEmployees();
    } catch (e: any) {
      alert(e.message || 'Error deleting employee');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.emp_code.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone.includes(search) ||
      emp.job_role.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
    const matchesStatus = statusFilter === 'all' || emp.employment_status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Employee & Worker Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin-only staff roster: manage shop floor fabricators, technicians, supervisors, and office staff.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, EMP code, phone, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
            <option value="Administration">Administration</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-[#13A89E] border-t-transparent rounded-full animate-spin" />
            <span>Loading employees roster...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No employees found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Emp Code & Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Department & Role</th>
                  <th className="py-3.5 px-4">Salary Structure</th>
                  <th className="py-3.5 px-4">Joining Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{emp.full_name}</div>
                      <span className="font-mono text-[11px] text-[#172B4D] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-1">
                        {emp.emp_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.phone}</span>
                      </div>
                      {emp.alternate_phone && (
                        <div className="text-[11px] text-slate-400 mt-0.5">Alt: {emp.alternate_phone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{emp.job_role}</div>
                      <div className="text-[11px] text-slate-500">{emp.department}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 text-sm">
                        ₹{Number(emp.base_salary).toLocaleString('en-IN')}
                        <span className="text-[10px] text-slate-500 font-normal ml-1">
                          / {emp.salary_type === 'monthly' ? 'month' : emp.salary_type === 'daily' ? 'day' : 'hr'}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#13A89E] capitalize">
                        {emp.salary_type} Wage
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {emp.joining_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        emp.employment_status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {emp.employment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-[#13A89E] hover:bg-teal-50 rounded-lg transition"
                          title="Edit Employee"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.full_name)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Deactivate / Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#13A89E] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingEmployee ? `Edit Employee (${editingEmployee.emp_code})` : 'Add New Employee / Worker'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure worker details, department, and salary rate</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Mohammed Bilal"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employee Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.emp_code}
                    onChange={(e) => setFormData({ ...formData, emp_code: e.target.value })}
                    placeholder="Auto-generated if empty (EMP-007)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={formData.alternate_phone}
                    onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                    placeholder="Optional secondary contact"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Role</label>
                  <select
                    value={formData.job_role}
                    onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] cursor-pointer"
                  >
                    <option value="Welder / Fabricator">Welder / Fabricator</option>
                    <option value="Senior Technician">Senior Technician</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Helper">Helper</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Office Staff">Office Staff</option>
                    <option value="Motor Commissioning Specialist">Motor Commissioning Specialist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] cursor-pointer"
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="Field Installation">Field Installation</option>
                    <option value="Billing & Accounts">Billing & Accounts</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
              </div>

              {/* Salary Structure Configuration */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider block mb-3">
                  Payroll & Wage Configuration
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Wage Type</label>
                    <select
                      value={formData.salary_type}
                      onChange={(e) => setFormData({ ...formData, salary_type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] cursor-pointer"
                    >
                      <option value="daily">Daily Wage (Calculated by days attended)</option>
                      <option value="monthly">Monthly Fixed Salary</option>
                      <option value="hourly">Hourly Rate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Base Rate (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formData.base_salary}
                      onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                      placeholder={formData.salary_type === 'monthly' ? '25000' : '850'}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employment Status</label>
                  <select
                    value={formData.employment_status}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Residence</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, Salem, Tamil Nadu"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2 bg-[#13A89E] hover:bg-[#0E8A81] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
