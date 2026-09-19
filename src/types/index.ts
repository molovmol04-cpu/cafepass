// CaféPass Type Definitions — Aligned with Backend Schema

export type Role = 'PLATFORM_ADMIN' | 'CAFE_OWNER' | 'CAFE_EMPLOYEE' | 'CUSTOMER';
export type CustomerLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type CafeStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';
export type LoyaltyTransactionType = 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRE' | 'ADJUST' | 'REVERSAL';
export type RewardType = 'DISCOUNT' | 'FREE_ITEM' | 'GIFT';
export type PromotionType = 'DOUBLE_POINTS' | 'DISCOUNT' | 'FREE_ITEM' | 'SPECIAL';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  cafeStaff?: CafeStaff[];
}

export interface CustomerProfile {
  id: string;
  userId: string;
  totalPoints: number;
  totalVisits: number;
  totalSpent: number;
  level: CustomerLevel;
  user?: { name: string; phone: string };
}

export interface Cafe {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  phone: string;
  logoUrl?: string;
  workingHours: string;
  loyaltyRate: number;
  status: CafeStatus;
  branches?: Branch[];
  rewards?: Reward[];
  promotions?: Promotion[];
  _count?: { purchases?: number; staff?: number };
}

export interface Branch {
  id: string;
  cafeId: string;
  name: string;
  address: string;
  phone?: string;
  isActive: boolean;
}

export interface CafeStaff {
  id: string;
  userId: string;
  cafeId: string;
  branchId?: string;
  role: Role;
  isActive: boolean;
  user?: { name: string; phone: string };
  cafe?: Cafe;
  branch?: Branch;
}

export interface Purchase {
  id: string;
  customerId: string;
  cafeId: string;
  branchId?: string;
  amount: number;
  pointsEarned: number;
  itemsJson: string;
  createdAt: string;
  customer?: { user?: { name: string } };
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  cafeId: string;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  cafe?: { name: string };
  customer?: { user?: { name: string } };
}

export interface Reward {
  id: string;
  cafeId: string;
  name: string;
  description?: string;
  pointsCost: number;
  type: RewardType;
  value?: number;
  isActive: boolean;
  cafe?: { name: string };
  canAfford?: boolean;
}

export interface Promotion {
  id: string;
  cafeId: string;
  title: string;
  description?: string;
  type: PromotionType;
  multiplier?: number;
  discountPercent?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface QRSession {
  token: string;
  expiresAt: string;
  expiresIn: number;
}

export type Page =
  | 'landing'
  | 'login'
  | 'register'
  // Customer
  | 'customer-home'
  | 'customer-qr'
  | 'customer-cafes'
  | 'customer-cafe-detail'
  | 'customer-rewards'
  | 'customer-history'
  | 'customer-profile'
  | 'customer-leaderboard'
  // Owner
  | 'owner-dashboard'
  | 'owner-customers'
  | 'owner-transactions'
  | 'owner-rewards'
  | 'owner-promotions'
  | 'owner-analytics'
  | 'owner-settings'
  // Employee
  | 'employee-dashboard'
  | 'employee-scan'
  | 'employee-purchase'
  // Admin
  | 'admin-dashboard'
  | 'admin-cafes'
  | 'admin-add-cafe'
  | 'admin-customers'
  | 'admin-analytics'
  | 'admin-audit-logs';
