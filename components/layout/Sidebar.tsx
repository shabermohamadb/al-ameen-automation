'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Ruler,
  Boxes,
  Users,
  ShoppingCart,
  CreditCard,
  Receipt,
  BarChart3,
  Wrench,
  ShieldCheck,
  Settings,
  Truck,
  LogOut,
  ChevronRight,
  UserCheck,
  Banknote,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    username: string;
    role: 'admin' | 'cashier';
    email: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      window.location.href = '/login';
    }
  };

  const isAdmin = !currentUser || currentUser.role === 'admin';

  const adminNavItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Sales & Invoices', href: '/sales', icon: FileText },
    { label: 'Quotation', href: '/quotations', icon: FileSpreadsheet },
    { label: 'Daily Attendance', href: '/attendance', icon: UserCheck },
    { label: 'E-Way Bill', href: '/eway-bill', icon: Truck },
    { label: 'Shutter Calculator', href: '/calculator', icon: Ruler, highlight: true },
    { label: 'Products & Inventory', href: '/products', icon: Boxes },
    { label: 'Customers & Suppliers', href: '/customers', icon: Users },
    { label: 'Employees & Staff', href: '/employees', icon: Users },
    { label: 'Salary & Payroll', href: '/salary', icon: Banknote },
    { label: 'Cashier Accounts', href: '/cashiers', icon: Shield },
    { label: 'Purchases', href: '/purchases', icon: ShoppingCart },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Expenses', href: '/expenses', icon: Receipt },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Manufacturing Jobs', href: '/manufacturing', icon: Wrench },
    { label: 'Installation & Service', href: '/service', icon: ShieldCheck },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const cashierNavItems = [
    { label: 'Cashier Dashboard', href: '/cashier', icon: LayoutDashboard },
    { label: 'Daily Attendance', href: '/attendance', icon: UserCheck },
    { label: 'Sales & Billing', href: '/sales', icon: FileText },
    { label: 'Quotation', href: '/quotations', icon: FileSpreadsheet },
    { label: 'E-Way Bill', href: '/eway-bill', icon: Truck },
    { label: 'Shutter Calculator', href: '/calculator', icon: Ruler, highlight: true },
    { label: 'Products Catalog', href: '/products', icon: Boxes },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Payments Received', href: '/payments', icon: CreditCard },
  ];

  const navItems = isAdmin ? adminNavItems : cashierNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#172B4D] text-white transition-transform duration-300 ease-in-out border-r border-[#203A65] shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#203A65]">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#0A1C36] p-1.5 shadow-lg shadow-black/40 border border-[#203A65] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png"
              alt="Al Ameen Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] tracking-tight text-white leading-tight">
              Al Ameen Automation
            </span>
            <span className="text-[11px] font-medium text-[#13A89E]">
              Rolling Shutter Manufacturing
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' || item.href === '/cashier'
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-[#13A89E] text-white shadow-md shadow-teal-950/20 font-semibold'
                    : 'text-slate-200/80 hover:bg-[#203A65] hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : item.highlight ? 'text-[#13A89E]' : 'text-slate-300/70'
                  }`}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="text-[10px] bg-[#13A89E]/20 text-[#13A89E] px-1.5 py-0.5 rounded-md font-semibold border border-[#13A89E]/30">
                    Tool
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </Link>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#203A65] bg-[#0A1C36]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow ${
              currentUser?.role === 'cashier'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400'
                : 'bg-[#172B4D] border border-white/20'
            }`}>
              {(currentUser?.fullName || currentUser?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white truncate max-w-[110px]">
                {currentUser?.fullName || (currentUser?.role === 'cashier' ? 'Cashier' : 'Admin')}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit ${
                currentUser?.role === 'cashier'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-teal-500/20 text-[#13A89E] border border-teal-500/30'
              }`}>
                {currentUser?.role === 'cashier' ? 'CASHIER' : 'ADMIN'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}

