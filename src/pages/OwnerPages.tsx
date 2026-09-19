import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, QrCode, Users, BarChart3, Settings, Gift, Sparkles, ShoppingBag, TrendingUp, ChevronLeft, Bell, LogOut, Coffee, Clock, MapPin, Crown, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Page } from '../types';

// Demo data
const DEMO_STATS = {
  todayVisits: 12,
  todayRevenue: 485000,
  todayPoints: 2425,
  totalCustomers: 45,
  weeklyData: [
    { day: 'Dush', visits: 18, revenue: 890000 },
    { day: 'Sesh', visits: 22, revenue: 1050000 },
    { day: 'Chor', visits: 15, revenue: 720000 },
    { day: 'Pay', visits: 28, revenue: 1340000 },
    { day: 'Jum', visits: 35, revenue: 1680000 },
    { day: 'Shan', visits: 42, revenue: 2100000 },
    { day: 'Yak', visits: 38, revenue: 1890000 },
  ]
};

const DEMO_CUSTOMERS = [
  { id: '1', name: 'Bobur Aliyev', totalVisits: 48, totalPoints: 2100, level: 'PLATINUM' },
  { id: '2', name: 'Sardor Karimov', totalVisits: 34, totalPoints: 1250, level: 'GOLD' },
  { id: '3', name: 'Jasur Toshmatov', totalVisits: 38, totalPoints: 1680, level: 'GOLD' },
  { id: '4', name: 'Nilufar Rashidova', totalVisits: 22, totalPoints: 890, level: 'SILVER' },
  { id: '5', name: 'Malika Yusupova', totalVisits: 12, totalPoints: 450, level: 'BRONZE' },
];

const DEMO_REWARDS = [
  { id: '1', name: 'Bepul Cappuccino', pointsCost: 500, isActive: true },
  { id: '2', name: '20% chegirma', pointsCost: 300, isActive: true },
  { id: '3', name: 'Bepul desert', pointsCost: 400, isActive: false },
];

function formatShort(amount: number): string {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = { BRONZE: '#cd7f32', SILVER: '#94a3b8', GOLD: '#d4a017', PLATINUM: '#7c3aed' };
  return colors[level] || '#6b7280';
}

// ============================================================
// OWNER DASHBOARD
// ============================================================
function OwnerDashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { user } = useAuth();
  const stats = DEMO_STATS;

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="bg-gradient-to-br from-espresso-950 to-espresso-900 px-6 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-cream-400 text-xs">Boshqaruv paneli</p>
            <h1 className="font-display text-xl font-bold text-white">{user?.name || 'Artel Coffee'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => onNavigate('employee-scan')} className="w-10 h-10 rounded-xl bg-coffee-500 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-coffee-400" />
              <span className="text-xs text-cream-300">Bugun tashriflar</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.todayVisits}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-cream-300">Bugun tushum</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatShort(stats.todayRevenue)}</p>
          </motion.div>
        </div>
      </div>

      <div className="px-6 -mt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <p className="text-xs text-espresso-500">Jami mijozlar</p>
            <p className="text-xl font-bold text-espresso-900 mt-1">{stats.totalCustomers}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <p className="text-xs text-espresso-500">Ball berildi</p>
            <p className="text-xl font-bold text-espresso-900 mt-1">{stats.todayPoints}</p>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="px-6 mt-6">
        <h2 className="font-display font-bold text-espresso-900 mb-3">Haftalik statistika</h2>
        <div className="p-4 bg-white rounded-2xl shadow-sm">
          <div className="flex items-end justify-between h-32 gap-2">
            {stats.weeklyData.map((day, i) => {
              const maxRevenue = Math.max(...stats.weeklyData.map(d => d.revenue));
              const height = (day.revenue / maxRevenue) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }} className="w-full bg-gradient-to-t from-coffee-500 to-coffee-300 rounded-t-lg min-h-[4px]" />
                  <span className="text-[10px] text-espresso-500">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-espresso-900">Top mijozlar</h2>
          <button onClick={() => onNavigate('owner-customers')} className="text-xs text-coffee-600 font-medium">Barchasi →</button>
        </div>
        <div className="space-y-2">
          {DEMO_CUSTOMERS.slice(0, 3).map((cust, i) => (
            <motion.div key={cust.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="flex items-center gap-3 p-3 bg-white rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coffee-200 to-coffee-300 flex items-center justify-center text-xs font-bold text-coffee-800">{i + 1}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-espresso-900">{cust.name}</p>
                <p className="text-xs text-espresso-500">{cust.totalVisits} tashrif</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: getLevelColor(cust.level) + '20', color: getLevelColor(cust.level) }}>
                {cust.level}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mt-6">
        <h2 className="font-display font-bold text-espresso-900 mb-3">Boshqarish</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Users, label: 'Mijozlar', page: 'owner-customers' as Page },
            { icon: ShoppingBag, label: 'Tranzaksiyalar', page: 'owner-transactions' as Page },
            { icon: Gift, label: 'Sovg\'alar', page: 'owner-rewards' as Page },
            { icon: BarChart3, label: 'Analitika', page: 'owner-analytics' as Page },
            { icon: Sparkles, label: 'Aksiyalar', page: 'owner-promotions' as Page },
            { icon: Settings, label: 'Sozlamalar', page: 'owner-settings' as Page },
          ].map((action, i) => (
            <motion.button key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.05 }} onClick={() => onNavigate(action.page)} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm card-hover active:scale-[0.97] transition-transform">
              <div className="w-9 h-9 rounded-lg bg-coffee-50 flex items-center justify-center">
                <action.icon className="w-4 h-4 text-coffee-600" />
              </div>
              <span className="text-sm font-medium text-espresso-700">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// OWNER CUSTOMERS
// ============================================================
function OwnerCustomers({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('owner-dashboard')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900 mb-1">Mijozlar</h1>
        <p className="text-sm text-espresso-500">{DEMO_CUSTOMERS.length} ta faol mijoz</p>
      </div>
      <div className="px-6 mt-4 space-y-2">
        {DEMO_CUSTOMERS.map((cust, i) => (
          <motion.div key={cust.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4 bg-white rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-coffee-200 to-coffee-300 flex items-center justify-center text-sm font-bold text-coffee-800">{cust.name.charAt(0)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-espresso-900">{cust.name}</p>
                <p className="text-xs text-espresso-500">{cust.totalVisits} tashrif • {cust.totalPoints} ball</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: getLevelColor(cust.level) + '20', color: getLevelColor(cust.level) }}>{cust.level}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OWNER REWARDS
// ============================================================
function OwnerRewards({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('owner-dashboard')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-espresso-900">Sovg'alar</h1>
          <button className="px-4 py-2 bg-coffee-500 text-white text-sm font-medium rounded-xl active:scale-95 transition-transform">+ Qo'shish</button>
        </div>
      </div>
      <div className="px-6 mt-4 space-y-3">
        {DEMO_REWARDS.map((reward, i) => (
          <motion.div key={reward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-4 bg-white rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-espresso-900">{reward.name}</h3>
                  <p className="text-xs text-espresso-500">{reward.pointsCost} ball</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${reward.isActive ? 'bg-emerald-400' : 'bg-espresso-300'}`} />
                <span className="text-xs text-espresso-500">{reward.isActive ? 'Faol' : 'O\'chirilgan'}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OWNER ANALYTICS
// ============================================================
function OwnerAnalytics({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const stats = DEMO_STATS;
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('owner-dashboard')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900">Analitika</h1>
      </div>
      <div className="px-6 mt-4 space-y-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm">
          <h3 className="font-semibold text-espresso-900 mb-3">Haftalik tushum</h3>
          <div className="flex items-end justify-between h-40 gap-2">
            {stats.weeklyData.map((day, i) => {
              const maxRevenue = Math.max(...stats.weeklyData.map(d => d.revenue));
              const height = (day.revenue / maxRevenue) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-espresso-400">{(day.revenue / 1000).toFixed(0)}K</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }} className="w-full bg-gradient-to-t from-coffee-500 to-coffee-300 rounded-t-lg min-h-[4px]" />
                  <span className="text-[10px] text-espresso-500">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <p className="text-xs text-espresso-500">O'rtacha check</p>
            <p className="text-lg font-bold text-espresso-900 mt-1">{formatShort(stats.todayRevenue / (stats.todayVisits || 1))}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <p className="text-xs text-espresso-500">Takrorlanish</p>
            <p className="text-lg font-bold text-espresso-900 mt-1">78%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GENERIC OWNER PAGE (for transactions, promotions, settings)
// ============================================================
function OwnerGenericPage({ title, onNavigate }: { title: string; onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('owner-dashboard')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900">{title}</h1>
      </div>
      <div className="px-6 mt-4">
        <div className="p-8 text-center bg-white rounded-2xl">
          <Settings className="w-12 h-12 text-espresso-200 mx-auto mb-3" />
          <p className="text-sm text-espresso-500">Bu bo'lim backend ulanganida to'liq ishlaydi</p>
          <p className="text-xs text-espresso-400 mt-1">Demo rejimda ma'lumotlar cheklangan</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
function OwnerBottomNav({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const tabs = [
    { icon: Home, label: 'Bosh', page: 'owner-dashboard' as Page },
    { icon: QrCode, label: 'Skaner', page: 'employee-scan' as Page },
    { icon: BarChart3, label: 'Analitika', page: 'owner-analytics' as Page },
    { icon: Users, label: 'Mijozlar', page: 'owner-customers' as Page },
    { icon: Settings, label: 'Sozl.', page: 'owner-settings' as Page },
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
export function OwnerPages({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  return (
    <>
      {currentPage === 'owner-dashboard' && <OwnerDashboard onNavigate={onNavigate} />}
      {currentPage === 'owner-customers' && <OwnerCustomers onNavigate={onNavigate} />}
      {currentPage === 'owner-transactions' && <OwnerGenericPage title="Tranzaksiyalar" onNavigate={onNavigate} />}
      {currentPage === 'owner-rewards' && <OwnerRewards onNavigate={onNavigate} />}
      {currentPage === 'owner-promotions' && <OwnerGenericPage title="Aksiyalar" onNavigate={onNavigate} />}
      {currentPage === 'owner-analytics' && <OwnerAnalytics onNavigate={onNavigate} />}
      {currentPage === 'owner-settings' && <OwnerGenericPage title="Sozlamalar" onNavigate={onNavigate} />}
      <OwnerBottomNav currentPage={currentPage} onNavigate={onNavigate} />
    </>
  );
}
