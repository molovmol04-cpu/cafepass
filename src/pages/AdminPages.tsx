import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Coffee, Users, BarChart3, FileText, ChevronLeft, Plus, Building2, MapPin, Phone, Clock, Check, Shield, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Page } from '../types';
import { api } from '../api/client';

// Demo data
const DEMO_CAFES = [
  { id: '1', name: 'Artel Coffee', address: 'Navoiy ko\'chasi, 45', city: 'Namangan', phone: '+998 69 222 33 44', status: 'ACTIVE', branches: 2, staff: 4, purchases: 156, createdAt: '2025-01-15' },
  { id: '2', name: 'Bukhara Coffee House', address: 'Mustaqillik shoh ko\'chasi, 88', city: 'Namangan', phone: '+998 69 222 55 66', status: 'ACTIVE', branches: 1, staff: 3, purchases: 89, createdAt: '2025-02-01' },
  { id: '3', name: 'Latte Art Café', address: 'Amir Temur ko\'chasi, 23', city: 'Namangan', phone: '+998 69 222 77 88', status: 'ACTIVE', branches: 1, staff: 2, purchases: 67, createdAt: '2025-03-10' },
  { id: '4', name: 'Green Bean', address: 'Yangibozor ko\'chasi, 5', city: 'Namangan', phone: '+998 69 222 99 00', status: 'PENDING', branches: 1, staff: 0, purchases: 0, createdAt: '2025-04-01' },
];

const DEMO_STATS = {
  totalCafes: 4,
  totalCustomers: 127,
  totalEmployees: 12,
  activeCafes: 3,
  todayPurchases: 28,
};

const DEMO_AUDIT_LOGS = [
  { id: '1', action: 'cafe.created', entityType: 'Cafe', entityId: '1', actor: 'Admin', createdAt: '2025-06-14T10:00:00Z' },
  { id: '2', action: 'owner.assigned', entityType: 'CafeStaff', entityId: '1', actor: 'Admin', createdAt: '2025-06-14T09:30:00Z' },
  { id: '3', action: 'reward.created', entityType: 'Reward', entityId: '5', actor: 'Artel Coffee', createdAt: '2025-06-13T15:00:00Z' },
  { id: '4', action: 'promotion.created', entityType: 'Promotion', entityId: '3', actor: 'Artel Coffee', createdAt: '2025-06-12T11:00:00Z' },
];

function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
    case 'PENDING': return 'bg-amber-100 text-amber-700';
    case 'SUSPENDED': return 'bg-rose-100 text-rose-700';
    default: return 'bg-espresso-100 text-espresso-500';
  }
}

function getStatusName(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Faol';
    case 'PENDING': return 'Kutilmoqda';
    case 'SUSPENDED': return 'To\'xtatilgan';
    default: return status;
  }
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
function AdminDashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="bg-gradient-to-br from-espresso-950 to-espresso-900 px-6 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-coffee-400" />
              <p className="text-cream-400 text-xs">Platform Administrator</p>
            </div>
            <h1 className="font-display text-xl font-bold text-white">CaféPass Admin</h1>
          </div>
          <button onClick={() => onNavigate('admin-add-cafe')} className="px-4 py-2 bg-coffee-500 text-white text-sm font-medium rounded-xl active:scale-95 transition-transform flex items-center gap-1">
            <Plus className="w-4 h-4" /> Kafe
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <Building2 className="w-4 h-4 text-coffee-400 mb-2" />
            <p className="text-2xl font-bold text-white">{DEMO_STATS.totalCafes}</p>
            <p className="text-xs text-cream-300">Kafelar</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <Users className="w-4 h-4 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{DEMO_STATS.totalCustomers}</p>
            <p className="text-xs text-cream-300">Mijozlar</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <Activity className="w-4 h-4 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-white">{DEMO_STATS.todayPurchases}</p>
            <p className="text-xs text-cream-300">Bugun sotuv</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <Coffee className="w-4 h-4 text-rose-400 mb-2" />
            <p className="text-2xl font-bold text-white">{DEMO_STATS.activeCafes}</p>
            <p className="text-xs text-cream-300">Faol kafelar</p>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mt-6">
        <h2 className="font-display font-bold text-espresso-900 mb-3">Boshqarish</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Coffee, label: 'Kafelar', page: 'admin-cafes' as Page, count: DEMO_STATS.totalCafes },
            { icon: Users, label: 'Mijozlar', page: 'admin-customers' as Page, count: DEMO_STATS.totalCustomers },
            { icon: BarChart3, label: 'Analitika', page: 'admin-analytics' as Page, count: null },
            { icon: FileText, label: 'Audit log', page: 'admin-audit-logs' as Page, count: null },
          ].map((action, i) => (
            <motion.button key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }} onClick={() => onNavigate(action.page)} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm card-hover active:scale-[0.97] transition-transform">
              <div className="w-9 h-9 rounded-lg bg-coffee-50 flex items-center justify-center">
                <action.icon className="w-4 h-4 text-coffee-600" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-espresso-700 block">{action.label}</span>
                {action.count !== null && <span className="text-xs text-espresso-400">{action.count} ta</span>}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Cafes */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-espresso-900">Oxirgi kafelar</h2>
          <button onClick={() => onNavigate('admin-cafes')} className="text-xs text-coffee-600 font-medium">Barchasi →</button>
        </div>
        <div className="space-y-2">
          {DEMO_CAFES.slice(0, 3).map((cafe, i) => (
            <motion.div key={cafe.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="p-3 bg-white rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coffee-100 to-coffee-200 flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-coffee-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-espresso-900">{cafe.name}</p>
                  <p className="text-xs text-espresso-500">{cafe.address}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(cafe.status)}`}>
                  {getStatusName(cafe.status)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminCafes({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [cafes, setCafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCafes = async () => {
      try {
        const result = await api.getAdminCafes();
        console.log(result);
        setCafes(result.cafes || []);
      } catch (error) {
        console.error('Cafes loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCafes();
  }, []);
  alert('ADMIN CAFES ISHLAYAPTI');
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="flex items-center gap-1 text-espresso-500 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Ortga</span>
        </button>

        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-espresso-900">
            Kafelar
          </h1>

          <button
            onClick={() => onNavigate('admin-add-cafe')}
            className="px-4 py-2 bg-coffee-500 text-white text-sm font-medium rounded-xl active:scale-95 transition-transform flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        </div>
      </div>

      <div className="px-6 mt-4 space-y-3">
        {loading ? (
          <p className="text-center text-espresso-500">Yuklanmoqda...</p>
        ) : cafes.length === 0 ? (
          <p className="text-center text-espresso-500">Hozircha kafe yo'q</p>
        ) : (
          cafes.map((cafe, i) => (
            <motion.div
              key={cafe.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 bg-white rounded-2xl shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coffee-100 to-coffee-200 flex items-center justify-center flex-shrink-0">
                  <Coffee className="w-6 h-6 text-coffee-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-espresso-900">
                      {cafe.name}
                    </h3>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(cafe.status)}`}
                    >
                      {getStatusName(cafe.status)}
                    </span>
                  </div>

                  <p className="text-sm text-espresso-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {cafe.address}
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-espresso-400">
                      {Array.isArray(cafe.branches) ? cafe.branches.length : 0} filial
                    </span>
                    <span className="text-xs text-espresso-400">
                      {Array.isArray(cafe.staff) ? cafe.staff.length :  0} xodim
                    </span>
                    <span className="text-xs text-espresso-400">
                      {cafe.purchases ?? 0} sotuv
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN ADD CAFE
// ============================================================
function AdminAddCafe({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: 'Namangan',
    phone: '',
    workingHours: '08:00 — 22:00',
    loyaltyRate: 5,
    ownerName: '',
    ownerPhone: '',
    branchName: 'Asosiy filial',
    branchAddress: '',
  });
  const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
    if (!form.name || !form.address || !form.phone || !form.ownerName || !form.ownerPhone) {
      alert('Iltimos, barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    try {
      const result = await api.createCafe({
      ...form,
      branchAddress: form.branchAddress || form.address,
    });

      console.log('Cafe created:', result);

      setSuccess(true);

      setTimeout(() => onNavigate('admin-cafes'), 2000);
    } catch (error: any) {
      console.error('Cafe creation error:', error);

      alert(
        error?.message ||
        'Kafe qo‘shishda xatolik yuz berdi'
      );
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="font-display text-xl font-bold text-espresso-900 mb-2">Kafe muvaffaqiyatli qo'shildi!</h2>
          <p className="text-sm text-espresso-500">Egasi tez orada tizimga kirishi mumkin</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-12">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('admin-dashboard')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900 mb-1">Yangi kafe qo'shish</h1>
        <p className="text-sm text-espresso-500">Kafe, egasi va filial ma'lumotlarini kiriting</p>
      </div>

      <div className="px-6 mt-4 space-y-6">
        {/* Cafe Info */}
        <div className="p-4 bg-white rounded-2xl shadow-sm space-y-3">
          <h3 className="font-semibold text-espresso-900 flex items-center gap-2">
            <Coffee className="w-4 h-4 text-coffee-500" /> Kafe ma'lumotlari
          </h3>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Kafe nomi *" className="w-full px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Tavsif" rows={2} className="w-full px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400 resize-none" />
          <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Manzil *" className="w-full px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
          <div className="flex gap-3">
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Telefon *" className="flex-1 px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
            <input value={form.workingHours} onChange={e => setForm({...form, workingHours: e.target.value})} placeholder="Ish vaqti" className="flex-1 px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-espresso-600">Ball stavkasi:</label>
            <input type="number" value={form.loyaltyRate} onChange={e => setForm({...form, loyaltyRate: parseInt(e.target.value) || 5})} className="w-20 px-3 py-2 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400 text-center" />
            <span className="text-xs text-espresso-500">ball / 1000 so'm</span>
          </div>
        </div>

        {/* Owner Info */}
        <div className="p-4 bg-white rounded-2xl shadow-sm space-y-3">
          <h3 className="font-semibold text-espresso-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-coffee-500" /> Egasi ma'lumotlari
          </h3>
          <input value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})} placeholder="Egasi ismi *" className="w-full px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
          <input value={form.ownerPhone} onChange={e => setForm({...form, ownerPhone: e.target.value})} placeholder="Egasi telefoni (+998...) *" className="w-full px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
        </div>

        {/* Branch Info */}
        <div className="p-4 bg-white rounded-2xl shadow-sm space-y-3">
          <h3 className="font-semibold text-espresso-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-coffee-500" /> Filial ma'lumotlari
          </h3>
          <input value={form.branchName} onChange={e => setForm({...form, branchName: e.target.value})} placeholder="Filial nomi" className="w-full px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
          <input value={form.branchAddress} onChange={e => setForm({...form, branchAddress: e.target.value})} placeholder="Filial manzili (kafe bilan bir xil bo'lsa bo'sh qoldiring)" className="w-full px-4 py-3 bg-cream-50 rounded-xl border border-espresso-100 outline-none focus:border-coffee-400" />
        </div>

        <button onClick={handleSubmit} className="w-full py-4 bg-gradient-to-r from-coffee-500 to-coffee-600 text-white font-semibold rounded-2xl shadow-lg shadow-coffee-500/20 active:scale-[0.98] transition-transform">
          Kafeni qo'shish
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN AUDIT LOGS
// ============================================================
function AdminAuditLogs({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('admin-dashboard')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900">Audit loglari</h1>
      </div>
      <div className="px-6 mt-4 space-y-2">
        {DEMO_AUDIT_LOGS.map((log, i) => (
          <motion.div key={log.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-3 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-espresso-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-espresso-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-espresso-900">{log.action}</p>
                <p className="text-xs text-espresso-400">{log.actor} • {new Date(log.createdAt).toLocaleDateString('uz-UZ')}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// GENERIC ADMIN PAGE
// ============================================================
function AdminGenericPage({ title, onNavigate }: { title: string; onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <div className="px-6 pt-12 pb-4">
        <button onClick={() => onNavigate('admin-dashboard')} className="flex items-center gap-1 text-espresso-500 mb-4">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm">Ortga</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-espresso-900">{title}</h1>
      </div>
      <div className="px-6 mt-4">
        <div className="p-8 text-center bg-white rounded-2xl">
          <BarChart3 className="w-12 h-12 text-espresso-200 mx-auto mb-3" />
          <p className="text-sm text-espresso-500">Backend ulanganida bu bo'lim to'liq ishlaydi</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
function AdminBottomNav({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const tabs = [
    { icon: Home, label: 'Bosh', page: 'admin-dashboard' as Page },
    { icon: Coffee, label: 'Kafelar', page: 'admin-cafes' as Page },
    { icon: Plus, label: 'Qo\'shish', page: 'admin-add-cafe' as Page },
    { icon: Users, label: 'Mijozlar', page: 'admin-customers' as Page },
    { icon: FileText, label: 'Log', page: 'admin-audit-logs' as Page },
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
export function AdminPages({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  return (
    <>
      {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={onNavigate} />}
      {currentPage === 'admin-cafes' && <AdminCafes onNavigate={onNavigate} />}
      {currentPage === 'admin-add-cafe' && <AdminAddCafe onNavigate={onNavigate} />}
      {currentPage === 'admin-customers' && <AdminGenericPage title="Mijozlar" onNavigate={onNavigate} />}
      {currentPage === 'admin-analytics' && <AdminGenericPage title="Analitika" onNavigate={onNavigate} />}
      {currentPage === 'admin-audit-logs' && <AdminAuditLogs onNavigate={onNavigate} />}
      <AdminBottomNav currentPage={currentPage} onNavigate={onNavigate} />
    </>
  );
}
