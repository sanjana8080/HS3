'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Mail, Eye, EyeOff, Sparkles, User, ShieldCheck, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [step, setStep] = useState<'DETAILS' | 'OTP_INPUT'>('DETAILS');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewOtpNotice, setPreviewOtpNotice] = useState('');

  // Request Login OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), purpose: 'LOGIN' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP code.');

      if (data.previewOtp) {
        setPreviewOtpNotice(`Demo Mode OTP: ${data.previewOtp}`);
      }

      setStep('OTP_INPUT');
    } catch (err: any) {
      setError(err.message || 'Failed to send login code');
    } finally {
      setLoading(false);
    }
  };

  // Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = authMethod === 'OTP'
        ? { email: email.trim(), otp: otp.trim(), authType: 'OTP' }
        : { email: email.trim(), password, authType: 'PASSWORD' };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      const targetUrl = data.user.role === 'SUPERVISOR' || data.user.role === 'ADMIN' 
        ? '/supervisor' 
        : '/dashboard';

      window.location.replace(targetUrl);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#100e14] text-[#F5E6EB] selection:bg-[#F4A8C4]/30 selection:text-[#FFF5F8] font-sans py-12">
      
      {/* Ambient Orbs */}
      <div className="absolute -top-20 -left-20 w-[460px] h-[460px] bg-[#E8A598]/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-28 -right-20 w-[500px] h-[500px] bg-[#E8A4C8]/20 rounded-full blur-[160px] pointer-events-none animate-pulse" />

      {/* Card Wrapper */}
      <div className="relative z-10 w-full max-w-[420px] mx-4 p-[1px] rounded-[2.3rem] overflow-hidden group shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
        <div className="absolute -inset-[150%] bg-[conic-gradient(from_0deg,#F4A8C4_0%,#BDB2CF_25%,#E8A598_50%,#E8A4C8_75%,#F4A8C4_100%)] opacity-35 blur-[2px] animate-spin pointer-events-none" style={{ animationDuration: '8s' }} />

        <div className="relative z-20 w-full h-full p-8 sm:p-9 rounded-[2.25rem] bg-[#16131c]/90 backdrop-blur-2xl">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#231b2c] border border-[#F4A8C4]/25 flex items-center justify-center shadow-inner mb-3">
              <span className="text-xl font-bold tracking-tight text-[#F4A8C4]">HS³</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#FFF0F5]">Welcome Back</h1>
            <p className="text-xs text-[#B3A6BC] mt-1 flex items-center gap-1.5 font-light">
              <Sparkles className="w-3 h-3 text-[#F4A8C4]" />
              Sign in to manage your mess schedule
            </p>
          </div>

          {/* Auth Method Pill */}
          {step === 'DETAILS' && (
            <div className="flex p-1 mb-5 rounded-2xl bg-[#100e14] border border-[#F4A8C4]/15">
              <button
                type="button"
                onClick={() => setAuthMethod('PASSWORD')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authMethod === 'PASSWORD' ? 'bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] font-semibold' : 'text-[#B3A6BC]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Password
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('OTP')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authMethod === 'OTP' ? 'bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] font-semibold' : 'text-[#B3A6BC]'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" /> OTP Login
              </button>
            </div>
          )}

          {/* Error & Preview Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {previewOtpNotice && (
            <div className="mb-4 p-3 rounded-xl bg-[#F4A8C4]/10 border border-[#F4A8C4]/30 text-[#F4A8C4] text-xs font-medium font-mono text-center">
              ⚡ {previewOtpNotice}
            </div>
          )}

          {/* Form */}
          {authMethod === 'PASSWORD' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#B3A6BC]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E85]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hs3.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#110e16]/80 border border-[#F4A8C4]/10 rounded-xl text-sm text-[#FFF5F8] focus:outline-none focus:border-[#F4A8C4]/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#B3A6BC]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E85]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#110e16]/80 border border-[#F4A8C4]/10 rounded-xl text-sm text-[#FFF5F8] focus:outline-none focus:border-[#F4A8C4]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A6E85] hover:text-[#F4A8C4]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] text-sm font-semibold shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In →'}
              </button>
            </form>
          ) : step === 'DETAILS' ? (
            <form onSubmit={handleRequestOtp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#B3A6BC]">Account Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E85]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hs3.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#110e16]/80 border border-[#F4A8C4]/10 rounded-xl text-sm text-[#FFF5F8] focus:outline-none focus:border-[#F4A8C4]/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] text-sm font-semibold shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Get Login OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#B3A6BC] text-center block">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E85]" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 bg-[#110e16]/90 border border-[#F4A8C4]/30 rounded-xl text-center text-lg tracking-[0.35em] font-mono text-[#FFF5F8] focus:outline-none focus:border-[#F4A8C4]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] text-sm font-semibold shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP & Sign In ↗'}
              </button>

              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="w-full text-xs text-[#B3A6BC] hover:text-[#FFF5F8] transition-colors text-center"
              >
                ← Back to email input
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
            <p className="text-xs text-[#B3A6BC]">
              Don't have an account?{' '}
              <Link href="/register" className="text-[#F4A8C4] hover:underline font-medium">
                Create Account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}