import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coffee, QrCode, User, MapPin, Gift, Clock, TrendingUp, Home, Award, History, ChevronLeft, ChevronRight, Heart, Crown, ShoppingBag, Eye, Sparkles, Star, LogOut, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import type { Page } from '../types';

// Demo data for when API is unavailable
const DEMO_PROFILE = {
  name: 'Sardor Karimov',
  phone: '+998 91 234 56 78',
  totalPoints: 1250,
  totalVisits: 34,
  totalSpent: 2850000,
  level: 'GOLD' as const,
  joinedAt: '2025-01-20T00:00:00Z'
};

const DEMO_CAFES = [
  { id: '1', name: 'Artel Coffee', description: 'Zamonaviy kofe va desertlar', address: 'Navoiy ko\'chasi, 45', city: 'Namangan', phone: '+998692223344', workingHours: '08:00 — 22:00', loyaltyRate: 5, status: 'ACTIVE' as const, branches: [{ id: 'b1', cafeId: '1', name: 'Markaziy', address: 'Navoiy 45', isActive: true }], rewards: [{ id: 'r1', cafeId: '1', name: 'Bepul Cappuccino', pointsCost: 500, type: 'FREE_ITEM' as const, isActive: true }], promotions: [] },
  { id: '2', name: 'Bukhara Coffee House', description: 'An\'anaviy kofe madaniyati', address: 'Mustaqillik shoh ko\'chasi, 88', city: 'Namangan', phone: '+998692225566', workingHours: '07:00 — 23:00', loyaltyRate: 3, status: 'ACTIVE' as const, branches: [], rewards: [], promotions: [] },
  { id: '3', name: 'Latte Art Café', description: 'Professional baristalar', address: 'Amir Temur ko\'chasi, 23', city: 'Namangan', phone: '+998692227788', workingHours: '09:00 — 21:00', loyaltyRate: 4, status: 'ACTIVE' as const, branches: [], rewards: [], promotions: [] },
];

const DEMO_TRANSACTIONS = [
  { id: 't1', type: 'EARN' as const, points: 225, description: 'Cappuccino + Cheesecake', cafeName: 'Artel Coffee', createdAt: '2025-06-14T10:30:00Z', balanceAfter: 1250 },
  { id: 't2', type: 'REDEEM' as const, points: -500, description: 'Bepul Cappuccino sovug\'i', cafeName: 'Artel Coffee', createdAt: '2025-06-12T14:00:00Z', balanceAfter: 1025 },
  { id: 't3', type: 'EARN' as const, points: 310, description: 'Latte x2 + Croissant', cafeName: 'Artel Coffee', createdAt: '2025-06-10T11:15:00Z', balanceAfter: 1525 },
];

function getLevelName(level: string): string {
  const names: Record<string, string> = { BRONZE: 'Bronza', SILVER: 'Kumush', GOLD: 'Oltin', PLATINUM: 'Platina' };
  return names[level] || level;
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = { BRONZE: '#cd7f32', SILVER: '#94a3b8', GOLD: '#d4a017', PLATINUM: '#7c3aed' };
  return colors[level] || '#6b7280';
}

function formatShort(amount: number): string {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
}

// ============================================================
// CUSTOMER HOME
// ============================================================
function CustomerHome({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { customerProfile, user } = useAuth();
  const profile = customerProfile || DEMO_PROFILE;
  const name = user?.name || DEMO_PROFILE.name;

  const nextLevel = profile.level === 'BRONZE' ? 'SILVER' : profile.level === 'SILVER' ? 'GOLD' : profile.level === 'GOLD' ? 'PLATINUM' : 'PLATINUM';
  const thresholds: Record<string, number> = { SILVER: 1000, GOLD: 2000, PLATINUM: 5000 };
  const pointsForNext = thresholds[nextLevel] || 5000;
  const progress = Math.min((profile.totalPoints / pointsForNext) * 100, 100);

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-espresso-950 to-espresso-900 px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-cream-400 text-sm">Salom,</p>
            <h1 className="font-display text-xl font-bold text-white">{name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('customer-qr')} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => onNavigate('customer-profile')} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Points Card */}
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-gradient-to-br from-coffee-500 to-coffee-700 rounded-2xl p-5 shadow-lg shadow-coffee-500/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-cream-200 text-xs font-medium">Sizning ballaringiz</p>
              <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="text-3xl font-bold text-white mt-1">
                {profile.totalPoints.toLocaleString()}
              </motion.p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: getLevelColor(profile.level) + '30', color: getLevelColor(profile.level) }}>
              <Crown className="w-3 h-3" />
              {getLevelName(profile.level)}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-cream-200 mb-1.5">
              <span>{getLevelName(nextLevel)} gacha</span>
              <span>{Math.max(0, pointsForNext - profile.totalPoints)} ball</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: 0.5, duration: 1 }} className="h-full bg-gradient-to-r from-cream-200 to-white rounded-full" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: QrCode, label: 'Mening kodim', page: 'customer-qr' as Page, color: 'from-coffee-400 to-coffee-500' },
            { icon: Gift, label: 'Sovg\'alar', page: 'customer-rewards' as Page, color: 'from-rose-400 to-rose-500' },
            { icon: MapPin, label: 'Kafelar', page: 'customer-cafes' as Page, color: 'from-emerald-400 to-emerald-500' },
          ].map((action, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} onClick={() => onNavigate(action.page)} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm card-hover active:scale-95 transition-transform">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-espresso-700">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 mt-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tashriflar', value: profile.totalVisits, icon: Eye },
            { label: 'Sarflangan', value: formatShort(profile.totalSpent), icon: ShoppingBag },
            { label: 'Reyting', value: '#3', icon: Trophy },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }} className="p-3 bg-white rounded-xl text-center">
              <stat.icon className="w-4 h-4 text-coffee-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-espresso-900">{stat.value}</p>
              <p className="text-[10px] text-espresso-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-espresso-900">So'nggi harakatlar</h2>
          <button onClick={() => onNavigate('customer-history')} className="text-xs text-coffee-600 font-medium">Barchasi →</button>
        </div>
        <div className="space-y-2">
          {DEMO_TRANSACTIONS.slice(0, 3).map((tx, i) => (
            <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-center gap-3 p-3 bg-white rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'EARN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {tx.type === 'EARN' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <Gift className="w-4 h-4 text-rose-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-espresso-900 truncate">{tx.description}</p>
                <p className="text-xs text-espresso-400">{tx.cafeName}</p>
              </div>
              <span className={`text-sm font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.points > 0 ? '+' : ''}{tx.points}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER QR - Real API Integration
// ============================================================
function CustomerQR({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(60);
  const [qrToken, setQrToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    generateQR();
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateQR(); // Auto-refresh when expired
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const generateQR = async () => {
    try {
      setLoading(true);
      const result = await api.generateQR();
      if (result.token) {
        setQrToken(result.token);
        setTimeLeft(result.expiresIn || 60);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Kod yaratishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-espresso-950 flex flex-col items-center justify-center px-6">
      <button onClick={() => onNavigate('customer-home')} className="absolute top-6 left-6 flex items-center gap-1 text-espresso-400">
        <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
      </button>
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-semibold text-white mb-1">Sizning kodingiz</h1>
        <p className="text-sm text-espresso-400">Kassadagi xodimga shu kodni ayting yoki ko'rsating</p>
      </div>

      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring' }} className="relative">
        <div className="w-full max-w-xs bg-white rounded-3xl px-8 py-10 shadow-2xl shadow-black/30 text-center">
          {loading && !qrToken ? (
            <div className="h-14 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-coffee-300 border-t-coffee-600 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-rose-500">{error}</p>
          ) : (
            <p className="font-display text-5xl font-semibold tracking-[0.15em] text-espresso-900">
              {qrToken.slice(0, 3)} {qrToken.slice(3)}
            </p>
          )}
          <div className="mt-5 h-1.5 bg-espresso-100 rounded-full overflow-hidden">
            <motion.div
              key={qrToken}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 60, ease: 'linear' }}
              className="h-full bg-coffee-500 rounded-full"
            />
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl animate-pulse-glow pointer-events-none" />
      </motion.div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
          <Clock className="w-4 h-4 text-coffee-400" />
          <span className="text-sm text-white font-medium">{timeLeft}s</span>
        </div>
        <p className="text-xs text-espresso-500 mt-2">Kod har 60 soniyada avtomatik yangilanadi</p>
      </div>

      <div className="mt-6 text-center">
        <p className="text-lg font-semibold text-white">{user?.name || 'Sardor Karimov'}</p>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER CAFES
// ============================================================
function CustomerCafes({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('customer-home')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900 mb-4">Hamkor kafelar</h1>
      </div>
      <div className="px-6 mt-4 space-y-3">
        {DEMO_CAFES.map((cafe, i) => (
          <motion.div key={cafe.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-4 bg-white rounded-2xl shadow-sm card-hover">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coffee-100 to-coffee-200 flex items-center justify-center flex-shrink-0">
                <Coffee className="w-6 h-6 text-coffee-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-espresso-900">{cafe.name}</h3>
                <p className="text-sm text-espresso-500 mt-0.5">{cafe.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-espresso-400"><MapPin className="w-3 h-3" />{cafe.address}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-coffee-600 font-medium"><Star className="w-3 h-3" />{cafe.loyaltyRate} ball / 1000 so'm</span>
                  <span className="flex items-center gap-1 text-xs text-espresso-400"><Clock className="w-3 h-3" />{cafe.workingHours}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-espresso-300 flex-shrink-0 mt-1" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER REWARDS
// ============================================================
function CustomerRewards({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { customerProfile } = useAuth();
  const points = customerProfile?.totalPoints || 1250;

  const rewards = [
    { id: '1', name: 'Bepul Cappuccino', description: 'Har qanday cappuccino bepul', pointsCost: 500, cafeName: 'Artel Coffee' },
    { id: '2', name: '20% chegirma', description: 'Keyingi buyurtmangizga 20% chegirma', pointsCost: 300, cafeName: 'Artel Coffee' },
    { id: '3', name: 'Bepul desert', description: 'Tanlangan desertlardan biri bepul', pointsCost: 400, cafeName: 'Bukhara Coffee' },
    { id: '4', name: 'Latte Art sovg\'asi', description: 'Maxsus latte art bilan latte', pointsCost: 600, cafeName: 'Latte Art Café' },
  ];

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('customer-home')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900 mb-1">Sovg'alar</h1>
        <p className="text-sm text-espresso-500">Sizda <span className="font-bold text-coffee-600">{points}</span> ball mavjud</p>
      </div>
      <div className="px-6 mt-4 space-y-3">
        {rewards.map((reward, i) => {
          const affordable = points >= reward.pointsCost;
          return (
            <motion.div key={reward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`p-4 rounded-2xl shadow-sm ${affordable ? 'bg-white' : 'bg-espresso-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${affordable ? 'bg-gradient-to-br from-amber-100 to-amber-200' : 'bg-espresso-100'}`}>
                  <Gift className={`w-6 h-6 ${affordable ? 'text-amber-600' : 'text-espresso-400'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-sm ${affordable ? 'text-espresso-900' : 'text-espresso-500'}`}>{reward.name}</h3>
                  <p className="text-xs text-espresso-500 mt-0.5">{reward.cafeName}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${affordable ? 'text-coffee-600' : 'text-espresso-400'}`}>{reward.pointsCost}</p>
                  <p className="text-[10px] text-espresso-400">ball</p>
                  {affordable && <button className="mt-1 px-3 py-1 bg-coffee-500 text-white text-xs font-medium rounded-lg active:scale-95 transition-transform">Olish</button>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER HISTORY
// ============================================================
function CustomerHistory({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('customer-home')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900">Tarix</h1>
      </div>
      <div className="px-6 mt-4 space-y-2">
        {DEMO_TRANSACTIONS.map((tx, i) => (
          <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'EARN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {tx.type === 'EARN' ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <Gift className="w-5 h-5 text-rose-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-espresso-900">{tx.description}</p>
                <p className="text-xs text-espresso-500">{tx.cafeName} • {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}</p>
              </div>
              <span className={`text-sm font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.points > 0 ? '+' : ''}{tx.points}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER PROFILE
// ============================================================
function CustomerProfilePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { user, customerProfile, logout } = useAuth();
  const profile = customerProfile || DEMO_PROFILE;
  const phone = (profile as any).phone || DEMO_PROFILE.phone;

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="bg-gradient-to-br from-espresso-900 to-espresso-950 px-6 pt-12 pb-8 rounded-b-3xl">
        <button onClick={() => onNavigate('customer-home')} className="flex items-center gap-1 text-espresso-400 mb-6">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-coffee-400 to-coffee-600 flex items-center justify-center text-2xl font-bold text-white">
            {(user?.name || 'S').charAt(0)}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">{user?.name || DEMO_PROFILE.name}</h1>
            <p className="text-sm text-espresso-400">{phone}</p>
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: getLevelColor(profile.level) + '30', color: getLevelColor(profile.level) }}>
              <Crown className="w-3 h-3" />{getLevelName(profile.level)}
            </span>
          </div>
        </div>
      </div>
      <div className="px-6 mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-2xl text-center">
            <p className="text-2xl font-bold text-espresso-900">{profile.totalPoints.toLocaleString()}</p>
            <p className="text-xs text-espresso-500 mt-1">Ball</p>
          </div>
          <div className="p-4 bg-white rounded-2xl text-center">
            <p className="text-2xl font-bold text-espresso-900">{profile.totalVisits}</p>
            <p className="text-xs text-espresso-500 mt-1">Tashriflar</p>
          </div>
        </div>
        <button onClick={() => { logout(); onNavigate('landing'); }} className="w-full py-3 bg-white rounded-2xl text-rose-500 font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <LogOut className="w-4 h-4" />Chiqish
        </button>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
function CustomerBottomNav({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const tabs = [
    { icon: Home, label: 'Bosh', page: 'customer-home' as Page },
    { icon: QrCode, label: 'Kod', page: 'customer-qr' as Page },
    { icon: MapPin, label: 'Kafelar', page: 'customer-cafes' as Page },
    { icon: Gift, label: 'Sovg\'alar', page: 'customer-rewards' as Page },
    { icon: User, label: 'Profil', page: 'customer-profile' as Page },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-espresso-100 safe-bottom z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
        {tabs.map((tab) => {
          const isActive = currentPage === tab.page;
          return (
            <button key={tab.page} onClick={() => onNavigate(tab.page)} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-coffee-600' : 'text-espresso-400'}`}>
              <tab.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
export function CustomerPages({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const showNav = currentPage !== 'customer-qr';

  return (
    <>
      {currentPage === 'customer-home' && <CustomerHome onNavigate={onNavigate} />}
      {currentPage === 'customer-qr' && <CustomerQR onNavigate={onNavigate} />}
      {currentPage === 'customer-cafes' && <CustomerCafes onNavigate={onNavigate} />}
      {currentPage === 'customer-cafe-detail' && <CustomerCafes onNavigate={onNavigate} />}
      {currentPage === 'customer-rewards' && <CustomerRewards onNavigate={onNavigate} />}
      {currentPage === 'customer-history' && <CustomerHistory onNavigate={onNavigate} />}
      {currentPage === 'customer-profile' && <CustomerProfilePage onNavigate={onNavigate} />}
      {currentPage === 'customer-leaderboard' && <CustomerHistory onNavigate={onNavigate} />}
      {showNav && <CustomerBottomNav currentPage={currentPage} onNavigate={onNavigate} />}
    </>
  );
}
