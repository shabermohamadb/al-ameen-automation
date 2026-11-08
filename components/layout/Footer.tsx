import React from 'react';
import { MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto px-4 md:px-8 py-4 border-t border-[#E2E8F0] bg-white/60 text-slate-500 text-xs flex flex-col md:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-center md:text-left">
        <MapPin className="w-3.5 h-3.5 text-[#13A89E] shrink-0" />
        <span>Danishpet Main Road, Santhaipet, Kadayapatti (Tk), Salem (Dt).</span>
      </div>

      <div className="text-slate-400">
        Al Ameen Automation © 2025. All rights reserved.
      </div>

      <div className="flex items-center gap-1.5 font-medium text-slate-600">
        <span>Powered by</span>
        <span className="font-bold text-[#172B4D] flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt="Al Ameen Logo"
            className="w-4 h-4 object-contain inline-block"
          />
          Al Ameen Automation
        </span>
      </div>
    </footer>
  );
}
