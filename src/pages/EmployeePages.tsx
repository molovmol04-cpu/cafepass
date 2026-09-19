import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, ChevronLeft, Check, Clock, Coffee, User, TrendingUp, ShoppingBag, Home, Gift, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import type { Page } from '../types';

// ============================================================
// EMPLOYEE DASHBOARD
// ============================================================
function EmployeeDashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ purchases: 0, revenue: 0, points: 0 });
  const [loading, setLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await api.getEmployeeDashboard();
      if (result.todayStats) {
        setStats({
          purchases: result.todayStats.purchases || 0,
          revenue: result.todayStats.revenue || 0,
          points: result.todayStats.pointsAwarded || 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRevenue = (amount: number) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return amount.toString();
  };

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="bg-gradient-to-br from-espresso-950 to-espresso-900 px-6 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-cream-400 text-xs">Xodim paneli</p>
            <h1 className="font-display text-xl font-bold text-white">{user?.name || 'Xodim'}</h1>
          </div>
          <button onClick={() => onNavigate('employee-scan')} className="w-12 h-12 rounded-xl bg-coffee-500 flex items-center justify-center shadow-lg shadow-coffee-500/30">
            <QrCode className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Today Stats */}
      <div className="px-6 -mt-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl text-center shadow-sm">
            <ShoppingBag className="w-4 h-4 text-coffee-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-espresso-900">{stats.purchases}</p>
            <p className="text-[10px] text-espresso-500">Sotuv</p>
          </div>
          <div className="p-3 bg-white rounded-xl text-center shadow-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-espresso-900">{formatRevenue(stats.revenue)}</p>
            <p className="text-[10px] text-espresso-500">Tushum</p>
          </div>
          <div className="p-3 bg-white rounded-xl text-center shadow-sm">
            <Gift className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-espresso-900">{stats.points}</p>
            <p className="text-[10px] text-espresso-500">Ball</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mt-6">
        <h2 className="font-display font-bold text-espresso-900 mb-3">Tezkor amallar</h2>
        <div className="space-y-3">
          <motion.button 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            onClick={() => onNavigate('employee-scan')} 
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm card-hover active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coffee-400 to-coffee-500 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-espresso-900">Mijozni aniqlash</h3>
              <p className="text-sm text-espresso-500">Mijoz kodini kiriting</p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYEE SCAN - Real API Integration
// ============================================================
function EmployeeScan({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { user } = useAuth();
  const myCafeId = user?.cafeStaff?.[0]?.cafeId;
  const [step, setStep] = useState<'scan' | 'customer' | 'purchase' | 'success'>('scan');
  const [qrToken, setQrToken] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchaseResult, setPurchaseResult] = useState<any>(null);

  const handleScan = async () => {
    if (qrToken.trim().length !== 6) {
      setError('6 xonali kodni to\'liq kiriting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.scanQR(qrToken.trim());
      
      if (result.error) {
        setError(result.error);
      } else if (result.customer) {
        setCustomer(result.customer);
        setStep('customer');
      }
    } catch (err) {
      setError('Skanerlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPurchase = async () => {
    if (!amount || parseInt(amount) <= 0) {
      setError('To\'g\'ri summa kiriting');
      return;
    }

    if (!customer || !customer.id) {
      setError('Mijoz ma\'lumotlari topilmadi');
      return;
    }

    if (!myCafeId) {
      setError('Sizga hech qanday kafe biriktirilmagan. Administratorga murojaat qiling.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.processPurchase({
        customerId: customer.id,
        cafeId: myCafeId,
        amount: parseInt(amount),
        items: [{ name: 'Xarid', quantity: 1, price: parseInt(amount) }]
      });

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setPurchaseResult(result);
        setStep('success');
      }
    } catch (err) {
      setError('Xaridni qayd etishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('scan');
    setQrToken('');
    setCustomer(null);
    setAmount('');
    setError('');
    setPurchaseResult(null);
  };

  return (
    <div className="min-h-screen bg-espresso-950 flex flex-col items-center justify-center px-6">
      <button onClick={() => onNavigate('employee-dashboard')} className="absolute top-6 left-6 flex items-center gap-1 text-espresso-400">
        <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
      </button>

      <AnimatePresence mode="wait">
        {step === 'scan' && (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center w-full max-w-sm">
            <h1 className="font-display text-xl font-semibold text-white mb-2">Mijozni aniqlash</h1>
            <p className="text-sm text-espresso-400 mb-8">Mijoz ilovasidagi 6 xonali kodni kiriting</p>

            <div className="mb-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={qrToken}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setQrToken(digits);
                  if (error) setError('');
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && qrToken.length === 6) handleScan(); }}
                placeholder="000000"
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-3xl font-display tracking-[0.3em] placeholder:text-espresso-600 outline-none focus:border-coffee-400"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl">
                <p className="text-sm text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            <button 
              onClick={handleScan} 
              disabled={loading || qrToken.length !== 6}
              className="w-full px-8 py-3 bg-coffee-500 text-white font-medium rounded-2xl active:scale-95 transition-transform disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Tasdiqlash'}
            </button>
          </motion.div>
        )}

        {step === 'customer' && customer && (
          <motion.div key="customer" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="text-center w-full max-w-sm">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-1">Mijoz aniqlandi!</h2>
            <p className="text-lg text-cream-300 font-medium">{customer.name}</p>
            
            <div className="mt-6 p-4 bg-white/10 rounded-2xl text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-espresso-400">Daraja</span>
                <span className="text-sm font-medium text-white">{customer.level}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-espresso-400">Ball</span>
                <span className="text-sm font-medium text-white">{customer.totalPoints}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-espresso-400">Tashriflar</span>
                <span className="text-sm font-medium text-white">{customer.totalVisits}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={reset} className="flex-1 py-3 bg-white/10 text-white font-medium rounded-xl active:scale-95 transition-transform">
                Yangi
              </button>
              <button onClick={() => setStep('purchase')} className="flex-1 py-3 bg-coffee-500 text-white font-medium rounded-xl active:scale-95 transition-transform">
                Sotuv
              </button>
            </div>
          </motion.div>
        )}

        {step === 'purchase' && (
          <motion.div key="purchase" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="text-center w-full max-w-sm">
            <h2 className="font-display text-xl font-bold text-white mb-2">Sotuv kiritish</h2>
            <p className="text-sm text-espresso-400 mb-6">Mijoz: {customer?.name}</p>
            
            <div className="mb-4">
              <label className="text-sm text-cream-300 mb-2 block text-left">Summa (so'm)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="45000"
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-xl font-bold text-center placeholder:text-espresso-500 outline-none focus:border-coffee-400"
              />
              {amount && parseInt(amount) > 0 && (
                <p className="text-sm text-emerald-400 mt-2">
                  +{Math.floor(parseInt(amount) / 1000 * 5)} ball beriladi
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl">
                <p className="text-sm text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('customer')} className="flex-1 py-3 bg-white/10 text-white font-medium rounded-xl active:scale-95 transition-transform">
                Ortga
              </button>
              <button 
                onClick={handleProcessPurchase} 
                disabled={loading}
                className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Tasdiqlash'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && purchaseResult && (
          <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="text-center w-full max-w-sm">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-2">Muvaffaqiyatli!</h2>
            <p className="text-sm text-espresso-400 mb-6">Xarid qayd etildi va ball berildi</p>
            
            <div className="p-4 bg-white/10 rounded-2xl text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-espresso-400">Summa:</span>
                <span className="text-sm font-medium text-white">{purchaseResult.purchase?.amount?.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-espresso-400">Berilgan ball:</span>
                <span className="text-sm font-medium text-emerald-400">+{purchaseResult.purchase?.pointsEarned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-espresso-400">Yangi balans:</span>
                <span className="text-sm font-medium text-white">{purchaseResult.customer?.newBalance}</span>
              </div>
            </div>

            <button onClick={reset} className="mt-6 w-full py-3 bg-coffee-500 text-white font-medium rounded-xl active:scale-95 transition-transform">
              Yangi operatsiya
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
export function EmployeePages({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  return (
    <>
      {currentPage === 'employee-dashboard' && <EmployeeDashboard onNavigate={onNavigate} />}
      {currentPage === 'employee-scan' && <EmployeeScan onNavigate={onNavigate} />}
      {currentPage === 'employee-purchase' && <EmployeeScan onNavigate={onNavigate} />}
    </>
  );
}
