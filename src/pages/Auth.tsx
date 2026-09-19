import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, ChevronLeft, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import type { Page } from '../types';

// Phone validation
function validateUzPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^\d+]/g, '');
  let digits = cleaned;
  if (digits.startsWith('+998')) digits = digits.slice(1);
  else if (!digits.startsWith('998')) return false;
  const sub = digits.slice(3);
  if (sub.length !== 9) return false;
  const prefix = sub.slice(0, 2);
  return ['90','91','93','94','95','97','98','99'].includes(prefix);
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  let digits = cleaned;
  if (digits.startsWith('998')) digits = digits.slice(3);
  return `+998${digits}`;
}

export function AuthPage({ mode, onNavigate }: { mode: Page; onNavigate: (page: Page) => void }) {
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+998 ');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const isRegister = mode === 'register';

  const handleSendOTP = async () => {
    setError('');
    if (!validateUzPhone(phone)) {
      setError('Noto\'g\'ri telefon raqami. +998 bilan boshlanishi kerak.');
      return;
    }
    if (isRegister && name.trim().length < 2) {
      setError('Iltimos, ismingizni kiriting.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.sendOTP(normalizePhone(phone));
      if (result.error) {
        setError(result.error);
      } else {
        setStep('otp');
        // In dev mode, show the code for testing
        if (result.devCode) {
          setDevCode(result.devCode);
        }
        setCooldown(60);
        const timer = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setError('Server bilan bog\'lanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 4) {
      setError('4 xonali kodni kiriting');
      return;
    }

    setLoading(true);
    try {
      const result = await api.verifyOTP(normalizePhone(phone), code, isRegister ? name : undefined);
      if (result.error) {
        setError(result.error);
      } else if (result.token && result.user) {
        login(result.token, result.user, result.user.customerProfile);
      }
    } catch {
      setError('Tekshirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-focus next
    if (value && index < 3) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 px-6 py-12">
      <button onClick={() => onNavigate('landing')} className="flex items-center gap-1 text-espresso-500 mb-8">
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm">Ortga</span>
      </button>

      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-2xl font-semibold text-espresso-900 mb-2">{step === 'phone' ? (isRegister ? 'Ro\'yxatdan o\'tish' : 'Kirish') : 'Tasdiqlash kodi'}
        </h1>
        <p className="text-espresso-500 mb-6">
          {step === 'phone' 
            ? (isRegister ? 'CaféPass ga qo\'shiling' : 'Hisobingizga kiring')
            : `${normalizePhone(phone)} raqamiga kod yuborildi`
          }
        </p>

        {/* Dev mode indicator */}
        {import.meta.env.DEV && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Development rejimi — Backend ulanmagan bo'lsa, demo ma'lumotlar ishlatiladi
            </p>
          </div>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-sm font-medium text-espresso-700 mb-1.5 block">Ism</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ismingiz"
                  className="w-full px-4 py-3.5 bg-white rounded-xl border border-espresso-200 focus:border-coffee-400 focus:ring-2 focus:ring-coffee-100 outline-none transition-all"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-espresso-700 mb-1.5 block">Telefon raqam</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 XX XXX XX XX"
                  className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-espresso-200 focus:border-coffee-400 focus:ring-2 focus:ring-coffee-100 outline-none transition-all"
                />
              </div>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-coffee-500 to-coffee-600 text-white font-semibold rounded-2xl shadow-lg shadow-coffee-500/20 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? 'Yuborilmoqda...' : 'Kod yuborish'}
            </button>

            <p className="text-center text-sm text-espresso-500">
              {isRegister ? 'Hisobingiz bormi?' : 'Hisobingiz yo\'qmi?'}{' '}
              <button onClick={() => onNavigate(isRegister ? 'login' : 'register')} className="text-coffee-600 font-medium">
                {isRegister ? 'Kirish' : 'Ro\'yxatdan o\'ting'}
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {devCode && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700">
                  🛠 Dev rejim — Kod: <span className="font-mono font-bold">{devCode}</span>
                </p>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && i > 0) {
                      document.getElementById(`otp-${i - 1}`)?.focus();
                    }
                  }}
                  className="w-14 h-14 text-center text-xl font-bold bg-white border-2 border-espresso-200 rounded-xl focus:border-coffee-400 focus:ring-2 focus:ring-coffee-100 outline-none transition-all"
                />
              ))}
            </div>

            {error && <p className="text-sm text-rose-500 text-center">{error}</p>}

            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-coffee-500 to-coffee-600 text-white font-semibold rounded-2xl shadow-lg shadow-coffee-500/20 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
            </button>

            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-sm text-espresso-400">Qayta yuborish: {cooldown}s</p>
              ) : (
                <button onClick={() => { setStep('phone'); setOtp(['','','','']); }} className="text-sm text-coffee-600 font-medium">
                  Qaytadan kod yuborish
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
