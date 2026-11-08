'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import Link from 'next/navigation';
import { LayoutDashboard, Ruler, FileText, FileSpreadsheet, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const mobileNavItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Calculator', href: '/calculator', icon: Ruler },
    { label: 'Invoices', href: '/sales', icon: FileText },
    { label: 'Quotation', href: '/quotations', icon: FileSpreadsheet },
  ];

  if (pathname === '/login') {
    return <main className="min-h-screen antialiased">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172B4D] flex flex-col antialiased">
      {/* Sidebar for Desktop & Drawer for Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Wrapper */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content Viewport */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-8">
          {children}
        </main>

        <Footer />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] py-1.5 px-3 flex items-center justify-around lg:hidden shadow-lg">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium transition ${
                isActive ? 'text-[#13A89E] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#13A89E]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </a>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800"
        >
          <Menu className="w-5 h-5 text-slate-400" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
