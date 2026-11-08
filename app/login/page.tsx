'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  TrendingUp,
  Cog,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  User,
  Shield,
  Briefcase,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setRedirectPath(params.get('redirect'));
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  }, [isMuted]);

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !videoRef.current.muted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const [activeTab, setActiveTab] = useState<'admin' | 'manager'>('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          expectedRole: activeTab,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      // Successful login redirect
      const target = redirectPath || (data.user?.role === 'admin' ? '/' : '/cashier');
      router.push(target);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'manager') => {
    setActiveTab(role);
    setError(null);
    if (role === 'admin') {
      setIdentifier('admin');
      setPassword('Admin@123');
    } else {
      setIdentifier('manager');
      setPassword('manager@123');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F5F7FA] font-sans antialiased text-slate-800 relative overflow-x-hidden selection:bg-[#13A89E] selection:text-white">
      {/* ============================================================ */}
      {/* LEFT SECTION – FULL BLEED INDUSTRIAL VIDEO & BRANDING (Desktop) */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0A1C36] text-white flex-col justify-between p-8 sm:p-10 lg:p-12 xl:p-16 overflow-hidden shrink-0">
        {/* 1. Full Bleed Background Video Covering 100% of Left Panel */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          poster="/images/login_video_poster.jpg"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none z-0"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        >
          <source src="/videos/login_showcase.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* 2. Subtle Dark Navy Overlay for Text Readability & Contrast */}
        <div className="absolute inset-0 bg-[#0A1C36]/75 bg-gradient-to-b from-[#0A1C36]/80 via-[#0A1C36]/65 to-[#0A1C36]/85 pointer-events-none z-1" />

        {/* Subtle geometric teal accent light */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#13A89E]/20 rounded-full blur-3xl pointer-events-none z-1" />

        {/* 3. Header with Official Logo (Overlayed) */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 p-1 rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-center">
              <Image
                src="/images/alameen_left_brand_v2.png"
                alt="Al Ameen Automation Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="h-10 w-[1.5px] bg-white/20 shrink-0" />
            <div>
              <div className="flex items-baseline gap-1.5 leading-tight">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">Al Ameen</span>
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#13A89E]">Automation</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-normal tracking-wide mt-0.5">
                Rolling Shutter Manufacturing & Automation
              </p>
            </div>
          </div>

          {/* Sound / Mute Toggle Button in Top Corner */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
            className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white/90 hover:text-white backdrop-blur-md border border-white/15 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
            title={isMuted ? 'Click to unmute sound' : 'Click to mute sound'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#13A89E]" />
            )}
          </button>
        </div>

        {/* 4. Middle Content – Hero Heading, Tagline & Feature Highlights */}
        <div className="relative z-10 my-auto py-10 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-white shadow-lg">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#13A89E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#13A89E]"></span>
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/95">
              Industrial Automation in Motion
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] text-white drop-shadow-md">
              Smart Business <br />
              <span className="text-[#13A89E]">Management</span>
            </h1>
            <p className="text-base sm:text-lg italic text-slate-200 mt-3 font-medium tracking-wide drop-shadow-sm">
              Automate &bull; Manage &bull; Grow
            </p>
            <div className="w-14 h-1.5 bg-[#13A89E] rounded-full mt-4 shadow-sm" />
          </div>

          {/* Three Feature Highlights with Frosted Glass Overlay */}
          <div className="grid grid-cols-3 gap-3.5 pt-4">
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-md transition-all hover:bg-white/[0.1]">
              <div className="w-10 h-10 rounded-xl bg-[#13A89E]/25 text-[#13A89E] flex items-center justify-center mb-2 shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-white">Secure Access</span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-md transition-all hover:bg-white/[0.1]">
              <div className="w-10 h-10 rounded-xl bg-[#13A89E]/25 text-[#13A89E] flex items-center justify-center mb-2 shadow-inner">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-white">Better Control</span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-md transition-all hover:bg-white/[0.1]">
              <div className="w-10 h-10 rounded-xl bg-[#13A89E]/25 text-[#13A89E] flex items-center justify-center mb-2 shadow-inner">
                <Cog className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-white">Business Growth</span>
            </div>
          </div>
        </div>

        {/* 5. Left Footer */}
        <div className="relative z-10 text-xs text-slate-300 font-medium drop-shadow-sm">
          &copy; 2026 Al Ameen Automation. All rights reserved.
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT SECTION – LOGIN CARD & INDUSTRIAL BACKGROUND */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-8 sm:px-8 sm:py-12 relative overflow-hidden bg-[#F5F7FA]">
        {/* Subtle Decorative Industrial Gear Watermark (Top Right) */}
        <div className="absolute -top-12 -right-12 w-64 h-64 text-slate-300/40 pointer-events-none select-none">
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
            <circle cx="50" cy="50" r="28" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="14" fill="currentColor" fillOpacity="0.05" />
            <path d="M50 8v12M50 80v12M8 50h12M80 50h12M20.3 20.3l8.5 8.5M71.2 71.2l8.5 8.5M20.3 79.7l8.5-8.5M71.2 28.8l8.5-8.5" strokeWidth="4" strokeLinecap="round" />
            <path d="M50 20a30 30 0 1 0 0 60a30 30 0 1 0 0-60" strokeWidth="2" strokeDasharray="4 6" />
          </svg>
        </div>

        {/* Diagonal Geometric Color Flairs (matching reference design) */}
        <div className="hidden lg:block absolute -bottom-16 -right-16 w-80 h-80 bg-[#13A89E] rotate-45 transform origin-bottom-right pointer-events-none" />
        <div className="hidden lg:block absolute -bottom-24 -right-24 w-96 h-96 bg-[#0A1C36] rotate-45 transform origin-bottom-right pointer-events-none opacity-90" />
        <div className="hidden lg:block absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-[#0A1C36] via-[#13A89E]/40 to-transparent pointer-events-none" />

        {/* Mobile Header Video Banner (Visible on screens < lg) */}
        <div className="lg:hidden w-full max-w-[460px] mb-4 rounded-2xl overflow-hidden border border-slate-200/80 shadow-md relative bg-[#0A1C36]">
          <div className="relative w-full aspect-[16/9] overflow-hidden">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster="/images/login_video_poster.jpg"
              className="w-full h-full object-cover scale-[1.22] origin-[15%_15%]"
            >
              <source src="/videos/login_showcase.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1C36]/90 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-xs text-white font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#13A89E] animate-pulse" />
              <span>Al Ameen Automation Showcase</span>
            </div>
          </div>
        </div>

        {/* Crisp White Login Card */}
        <div className="w-full max-w-[460px] bg-white rounded-3xl sm:rounded-[32px] p-6 sm:p-10 shadow-2xl shadow-slate-900/10 border border-slate-100 relative z-10 transition-all">
          {/* Card Brand Header */}
          <div className="text-center">
            <div className="relative h-16 w-24 mx-auto mb-2">
              <Image
                src="/images/alameen_brand_emblem_v2.png"
                alt="Al Ameen Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-xl sm:text-[22px] font-extrabold text-[#172B4D] tracking-tight">
              Al Ameen Automation
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">
              Rolling Shutter Manufacturing & Automation
            </p>
          </div>

          {/* Welcome Back Title */}
          <div className="text-center mt-6 mb-5">
            <h3 className="text-2xl font-bold text-[#172B4D] tracking-tight">
              Welcome Back
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sign in to continue to your account
            </p>
          </div>

          {/* Role Switching Tabs (Admin Login vs Manager Login) */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#13A89E] text-white shadow-md shadow-[#13A89E]/30 border border-[#13A89E]'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Shield className={`w-4 h-4 ${activeTab === 'admin' ? 'text-white' : 'text-slate-600'}`} />
              <span>Admin Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('manager');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-[#13A89E] text-white shadow-md shadow-[#13A89E]/30 border border-[#13A89E]'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Briefcase className={`w-4 h-4 ${activeTab === 'manager' ? 'text-white' : 'text-slate-600'}`} />
              <span>Manager Login</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={activeTab === 'admin' ? 'Email or Admin Username' : 'Email or Manager Username'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[#13A89E] focus:ring-2 focus:ring-[#13A89E]/20 transition-all font-normal"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[#13A89E] focus:ring-2 focus:ring-[#13A89E]/20 transition-all font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#13A89E] hover:bg-[#10938a] active:bg-[#0d7d74] text-white font-semibold rounded-xl shadow-md shadow-[#13A89E]/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {activeTab === 'admin' ? 'Administrator' : 'Manager'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Test Credentials Section */}
          <div className="mt-6 pt-5 relative">
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">Quick Test Credentials</span>
            </div>
            <div className="absolute inset-x-0 top-7 h-[1px] bg-slate-200 -z-0" />

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-[#172B4D]" />
                <span>Admin Fill</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('manager')}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-[#13A89E]" />
                <span>Manager Fill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Small Mobile Copyright */}
        <div className="lg:hidden text-center text-xs text-slate-400 mt-6 font-medium">
          &copy; 2026 Al Ameen Automation. All rights reserved.
        </div>
      </div>
    </div>
  );
}

