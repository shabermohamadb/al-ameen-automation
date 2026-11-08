'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Sun, Moon, Building2, Menu, ChevronDown, LogOut } from 'lucide-react';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuToggle}
          className="p-2 text-[#172B4D] hover:bg-slate-100 rounded-xl lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices, customers, shutters, jobs... (Ctrl + K)"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-[#172B4D] placeholder-slate-400 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#13A89E]/20 focus:border-[#13A89E] transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 md:gap-4 ml-4">
        {/* Notification Bell */}
        <button
          className="relative p-2 text-[#172B4D] hover:text-[#13A89E] hover:bg-[#E6F7F6] rounded-xl transition"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-[#13A89E] rounded-full border-2 border-white">
            3
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 text-[#172B4D] hover:text-[#13A89E] hover:bg-[#E6F7F6] rounded-xl transition"
          title="Toggle light/dark theme"
        >
          {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Business Selector Dropdown */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt="Al Ameen"
            className="w-4 h-4 object-contain shrink-0"
          />
          <span className="text-xs font-semibold text-[#172B4D]">Al Ameen Automation</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-slate-100 ${
              currentUser?.role === 'cashier'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400'
                : 'bg-[#172B4D]'
            }`}>
              {(currentUser?.fullName || currentUser?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#172B4D] leading-tight">
                {currentUser?.fullName || (currentUser?.role === 'cashier' ? 'Cashier' : 'Admin')}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                currentUser?.role === 'cashier' ? 'text-[#16A36A]' : 'text-[#13A89E]'
              }`}>
                {currentUser?.role === 'cashier' ? 'Cashier Role' : 'Admin Role'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#172B4D] truncate">{currentUser?.fullName || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || ''}</p>
                <span className={`mt-1.5 inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  currentUser?.role === 'cashier'
                    ? 'bg-emerald-50 text-[#16A36A] border border-emerald-200'
                    : 'bg-teal-50 text-[#13A89E] border border-teal-200'
                }`}>
                  {currentUser?.role === 'cashier' ? 'Cashier Portal' : 'Administrator'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#DC4545] hover:bg-rose-50 transition text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
