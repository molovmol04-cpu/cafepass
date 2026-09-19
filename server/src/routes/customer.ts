import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authorize, createAuditLog } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const customerRouter = Router();

// Customer routes require CUSTOMER role
customerRouter.use(authorize('CUSTOMER'));

// ============================================================
// GET /api/customer/dashboard
// ============================================================

customerRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.userId! },
      include: {
        user: { select: { name: true, phone: true } },
        favoriteCafes: {
          include: { cafe: { select: { name: true, logoUrl: true } } }
        },
        loyaltyTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { cafe: { select: { name: true } } }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil topilmadi' });
    }

    // Calculate progress to next level
    const levelThresholds = { BRONZE: 0, SILVER: 1000, GOLD: 2000, PLATINUM: 5000 };
    const nextLevel = profile.level === 'BRONZE' ? 'SILVER' : profile.level === 'SILVER' ? 'GOLD' : profile.level === 'GOLD' ? 'PLATINUM' : 'PLATINUM';
    const nextThreshold = levelThresholds[nextLevel as keyof typeof levelThresholds];

    res.json({
      profile: {
        name: profile.user.name,
        phone: profile.user.phone,
        totalPoints: profile.totalPoints,
        totalVisits: profile.totalVisits,
        totalSpent: profile.totalSpent,
        level: profile.level,
        joinedAt: profile.createdAt
      },
      nextLevel: {
        name: nextLevel,
        threshold: nextThreshold,
        pointsNeeded: Math.max(0, nextThreshold - profile.totalPoints)
      },
      recentTransactions: profile.loyaltyTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        points: tx.points,
        description: tx.description,
        cafeName: tx.cafe.name,
        createdAt: tx.createdAt
      })),
      favoriteCafes: profile.favoriteCafes.map(fc => ({
        id: fc.cafe.id || '',
        name: fc.cafe.name
      }))
    });
  } catch (error) {
    console.error('Customer dashboard error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// POST /api/customer/qr — Generate a new QR session token
// ============================================================

customerRouter.post('/qr', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.userId! }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil topilmadi' });
    }

    // Generate a short-lived 6-digit code (cryptographically random).
    // Short on purpose: staff type this in at the till, so it must be
    // fast to read off a phone screen and fast to enter — a long hex
    // token is secure but unusable in a real checkout flow.
    const token = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

    // Invalidate any existing active sessions
    await prisma.qRSession.updateMany({
      where: {
        customerId: profile.id,
        expiresAt: { gte: new Date() },
        usedAt: null
      },
      data: { expiresAt: new Date() } // Expire them
    });

    // Create new session
    const session = await prisma.qRSession.create({
      data: {
        customerId: profile.id,
        token,
        expiresAt
      }
    });

    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      expiresIn: 60 // seconds
    });
  } catch (error) {
    console.error('QR generate error:', error);
    res.status(500).json({ error: 'QR kod yaratishda xatolik' });
  }
});

// ============================================================
// GET /api/customer/cafes — Discover partner cafés
// ============================================================

customerRouter.get('/cafes', async (req: Request, res: Response) => {
  try {
    const cafes = await prisma.cafe.findMany({
      where: { status: 'ACTIVE' },
      include: {
        branches: { where: { isActive: true } },
        promotions: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        },
        rewards: {
          where: { isActive: true },
          take: 3
        },
        _count: { select: { purchases: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ cafes });
  } catch (error) {
    console.error('Get cafes error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/customer/cafes/:cafeId — Café detail
// ============================================================

customerRouter.get('/cafes/:cafeId', async (req: Request, res: Response) => {
  try {
    const cafe = await prisma.cafe.findUnique({
      where: { id: req.params.cafeId, status: 'ACTIVE' },
      include: {
        branches: { where: { isActive: true } },
        rewards: { where: { isActive: true } },
        promotions: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        }
      }
    });

    if (!cafe) {
      return res.status(404).json({ error: 'Kafe topilmadi' });
    }

    res.json({ cafe });
  } catch (error) {
    console.error('Get cafe detail error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/customer/rewards — Available rewards from favorite cafés
// ============================================================

customerRouter.get('/rewards', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.userId! }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil topilmadi' });
    }

    // Get rewards from cafés the customer has visited
    const visitedCafeIds = await prisma.loyaltyTransaction.findMany({
      where: { customerId: profile.id },
      select: { cafeId: true },
      distinct: ['cafeId']
    });

    const cafeIds = visitedCafeIds.map(v => v.cafeId);

    const rewards = await prisma.reward.findMany({
      where: {
        cafeId: { in: cafeIds },
        isActive: true
      },
      include: {
        cafe: { select: { name: true } }
      },
      orderBy: { pointsCost: 'asc' }
    });

    res.json({
      rewards: rewards.map(r => ({
        ...r,
        canAfford: profile.totalPoints >= r.pointsCost
      })),
      totalPoints: profile.totalPoints
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/customer/history — Full transaction history
// ============================================================

customerRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.userId! }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil topilmadi' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { customerId: profile.id },
        include: {
          cafe: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.loyaltyTransaction.count({ where: { customerId: profile.id } })
    ]);

    res.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        points: tx.points,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        cafeName: tx.cafe.name,
        createdAt: tx.createdAt
      })),
      pagination: { page, limit, total }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// POST /api/customer/favorite/:cafeId — Toggle favorite café
// ============================================================

customerRouter.post('/favorite/:cafeId', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.userId! }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil topilmadi' });
    }

    const existing = await prisma.favoriteCafe.findUnique({
      where: {
        customerId_cafeId: {
          customerId: profile.id,
          cafeId: req.params.cafeId
        }
      }
    });

    if (existing) {
      await prisma.favoriteCafe.delete({ where: { id: existing.id } });
      res.json({ success: true, isFavorite: false });
    } else {
      await prisma.favoriteCafe.create({
        data: { customerId: profile.id, cafeId: req.params.cafeId }
      });
      res.json({ success: true, isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/customer/leaderboard — Rankings
// ============================================================

customerRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.userId! }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil topilmadi' });
    }

    // Top customers by visits
    const topByVisits = await prisma.customerProfile.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { totalVisits: 'desc' },
      take: 20
    });

    // Top customers by spending
    const topBySpending = await prisma.customerProfile.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { totalSpent: 'desc' },
      take: 20
    });

    // Find current user's rank
    const rankByVisits = await prisma.customerProfile.count({
      where: { totalVisits: { gt: profile.totalVisits } }
    }) + 1;

    res.json({
      topByVisits: topByVisits.map((c, i) => ({
        rank: i + 1,
        name: c.user.name,
        visits: c.totalVisits,
        level: c.level,
        isCurrentUser: c.id === profile.id
      })),
      topBySpending: topBySpending.map((c, i) => ({
        rank: i + 1,
        name: c.user.name,
        spent: c.totalSpent,
        level: c.level,
        isCurrentUser: c.id === profile.id
      })),
      myRank: {
        byVisits: rankByVisits,
        visits: profile.totalVisits,
        points: profile.totalPoints
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// PATCH /api/customer/profile — Update profile
// ============================================================

customerRouter.patch('/profile', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Ism kamida 2 belgidan iborat bo\'lishi kerak' });
    }

    // Update user name
    await prisma.user.update({
      where: { id: req.userId! },
      data: { name: name.trim() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profilni yangilashda xatolik' });
  }
});
