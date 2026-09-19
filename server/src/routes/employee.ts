import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authorize, loadCafeAccess, createAuditLog } from '../middleware/auth.js';
import { validateAmount } from '../utils/validation.js';
import { prisma } from '../lib/prisma.js';

export const employeeRouter = Router();

// Employee routes require CAFE_EMPLOYEE role
employeeRouter.use(authorize('CAFE_EMPLOYEE', 'CAFE_OWNER'));
employeeRouter.use(loadCafeAccess);

// ============================================================
// POST /api/employee/scan — Identify customer from QR token
// ============================================================

employeeRouter.post('/scan', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'QR token talab qilinadi' });
    }

    // Find the most recent session with this code. Codes are short
    // (6 digits) so they can repeat across customers over time — only
    // the newest one is ever within its 60s validity window anyway.
    const session = await prisma.qRSession.findFirst({
      where: { token: String(token) },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          include: {
            user: { select: { name: true, phone: true } }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'QR kod topilmadi' });
    }

    if (session.expiresAt < new Date()) {
      return res.status(410).json({ error: 'QR kod muddati tugagan. Iltimos, yangi kod oching.' });
    }

    if (session.usedAt) {
      return res.status(410).json({ error: 'Bu QR kod allaqachon ishlatilgan' });
    }

    // Mark session as used by this cafe
    await prisma.qRSession.update({
      where: { id: session.id },
      data: {
        usedAt: new Date(),
        cafeId: req.cafeIds?.[0] // Associate with scanning cafe
      }
    });

    res.json({
      customer: {
        id: session.customer.id,
        name: session.customer.user.name,
        phone: session.customer.user.phone,
        level: session.customer.level,
        totalPoints: session.customer.totalPoints,
        totalVisits: session.customer.totalVisits
      }
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Skanerlashda xatolik' });
  }
});

// ============================================================
// POST /api/employee/purchase — Process purchase and award loyalty
// ============================================================

const purchaseSchema = z.object({
  customerId: z.string(),
  cafeId: z.string(),
  branchId: z.string().optional(),
  amount: z.number().int().min(1, 'Summa 1 so\'mdan katta bo\'lishi kerak'),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().min(1),
    price: z.number().int().min(0)
  })).min(1, 'Kamida bitta mahsulot bo\'lishi kerak'),
  promotionId: z.string().optional()
});

employeeRouter.post('/purchase', async (req: Request, res: Response) => {
  try {
    const result = purchaseSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Ma\'lumotlar noto\'g\'ri', details: result.error.errors });
    }

    const data = result.data;

    // Verify cafe access
    if (!req.cafeIds?.includes(data.cafeId)) {
      return res.status(403).json({ error: 'Sizda bu kafega kirish huquqi yo\'q' });
    }

    // Get cafe loyalty rate
    const cafe = await prisma.cafe.findUnique({
      where: { id: data.cafeId },
      select: { loyaltyRate: true, status: true }
    });

    if (!cafe || cafe.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Kafe topilmadi yoki faol emas' });
    }

    // Check for active promotion
    let multiplier = 1;
    if (data.promotionId) {
      const promotion = await prisma.promotion.findFirst({
        where: {
          id: data.promotionId,
          cafeId: data.cafeId,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });
      if (promotion?.type === 'DOUBLE_POINTS' && promotion.multiplier) {
        multiplier = promotion.multiplier;
      }
    }

    // Calculate loyalty points
    const basePoints = Math.floor((data.amount / 1000) * cafe.loyaltyRate);
    const pointsEarned = Math.floor(basePoints * multiplier);

    // Create purchase and loyalty transaction in a transaction
    const purchaseResult = await prisma.$transaction(async (tx) => {
      // 1. Create purchase
      const purchase = await tx.purchase.create({
        data: {
          customerId: data.customerId,
          cafeId: data.cafeId,
          branchId: data.branchId,
          staffId: req.userId, // The employee who processed
          amount: data.amount,
          pointsEarned,
          itemsJson: JSON.stringify(data.items),
          promotionId: data.promotionId
        }
      });

      // 2. Get current balance
      const customer = await tx.customerProfile.findUnique({
        where: { id: data.customerId }
      });

      if (!customer) {
        throw new Error('Mijoz topilmadi');
      }

      const newBalance = customer.totalPoints + pointsEarned;

      // 3. Create loyalty transaction
      const loyaltyTx = await tx.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          cafeId: data.cafeId,
          branchId: data.branchId,
          type: 'EARN',
          points: pointsEarned,
          balanceAfter: newBalance,
          description: `Xarid: ${data.amount.toLocaleString()} so'm`,
          purchaseId: purchase.id,
          performedBy: req.userId
        }
      });

      // 4. Update customer stats
      const newVisits = customer.totalVisits + 1;
      const newSpent = customer.totalSpent + data.amount;

      // Determine new level
      let newLevel = customer.level;
      if (newBalance >= 5000) newLevel = 'PLATINUM';
      else if (newBalance >= 2000) newLevel = 'GOLD';
      else if (newBalance >= 1000) newLevel = 'SILVER';
      else newLevel = 'BRONZE';

      await tx.customerProfile.update({
        where: { id: data.customerId },
        data: {
          totalPoints: newBalance,
          totalVisits: newVisits,
          totalSpent: newSpent,
          level: newLevel
        }
      });

      return { purchase, loyaltyTx, newBalance, newLevel };
    });

    await createAuditLog(
      req.userId!,
      'purchase.processed',
      'Purchase',
      purchaseResult.purchase.id,
      { amount: data.amount, points: pointsEarned, customerId: data.customerId },
      req.ip || undefined
    );

    res.status(201).json({
      success: true,
      purchase: {
        id: purchaseResult.purchase.id,
        amount: data.amount,
        pointsEarned,
        items: data.items
      },
      customer: {
        newBalance: purchaseResult.newBalance,
        newLevel: purchaseResult.newLevel
      }
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Xaridni qayd etishda xatolik' });
  }
});

// ============================================================
// POST /api/employee/redeem-reward — Customer redeems a reward
// ============================================================

const redeemRewardSchema = z.object({
  customerId: z.string(),
  rewardId: z.string(),
  cafeId: z.string()
});

employeeRouter.post('/redeem-reward', async (req: Request, res: Response) => {
  try {
    const result = redeemRewardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Ma\'lumotlar noto\'g\'ri', details: result.error.errors });
    }

    const data = result.data;

    if (!req.cafeIds?.includes(data.cafeId)) {
      return res.status(403).json({ error: 'Sizda bu kafega kirish huquqi yo\'q' });
    }

    // Get reward
    const reward = await prisma.reward.findFirst({
      where: { id: data.rewardId, cafeId: data.cafeId, isActive: true }
    });

    if (!reward) {
      return res.status(404).json({ error: 'Sovg\'a topilmadi yoki faol emas' });
    }

    // Check customer balance
    const customer = await prisma.customerProfile.findUnique({
      where: { id: data.customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Mijoz topilmadi' });
    }

    if (customer.totalPoints < reward.pointsCost) {
      return res.status(400).json({ 
        error: `Yetarli ball mavjud emas. Kerak: ${reward.pointsCost}, Mavjud: ${customer.totalPoints}` 
      });
    }

    // Process redemption in transaction
    const redemptionResult = await prisma.$transaction(async (tx) => {
      const newBalance = customer.totalPoints - reward.pointsCost;

      // Create reward redemption record
      const redemption = await tx.rewardRedemption.create({
        data: {
          customerId: data.customerId,
          rewardId: data.rewardId,
          cafeId: data.cafeId,
          pointsUsed: reward.pointsCost
        }
      });

      // Create loyalty transaction (negative points)
      const loyaltyTx = await tx.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          cafeId: data.cafeId,
          type: 'REDEEM',
          points: -reward.pointsCost,
          balanceAfter: newBalance,
          description: `Sovg'a: ${reward.name}`,
          rewardRedemptionId: redemption.id,
          performedBy: req.userId
        }
      });

      // Update redemption with loyalty tx reference
      await tx.rewardRedemption.update({
        where: { id: redemption.id },
        data: { loyaltyTxId: loyaltyTx.id }
      });

      // Update customer balance
      let newLevel = customer.level;
      if (newBalance < 1000) newLevel = 'BRONZE';
      else if (newBalance < 2000) newLevel = 'SILVER';
      else if (newBalance < 5000) newLevel = 'GOLD';

      await tx.customerProfile.update({
        where: { id: data.customerId },
        data: {
          totalPoints: newBalance,
          level: newLevel
        }
      });

      return { redemption, newBalance, newLevel };
    });

    await createAuditLog(
      req.userId!,
      'reward.redeemed',
      'RewardRedemption',
      redemptionResult.redemption.id,
      { customerId: data.customerId, rewardId: data.rewardId, points: reward.pointsCost },
      req.ip || undefined
    );

    res.json({
      success: true,
      reward: { name: reward.name, pointsCost: reward.pointsCost },
      customer: {
        newBalance: redemptionResult.newBalance,
        newLevel: redemptionResult.newLevel
      }
    });
  } catch (error) {
    console.error('Redeem reward error:', error);
    res.status(500).json({ error: 'Sovg\'ani almashtirishda xatolik' });
  }
});

// ============================================================
// GET /api/employee/rewards — Get available rewards for this cafe
// ============================================================

employeeRouter.get('/rewards', async (req: Request, res: Response) => {
  try {
    if (!req.cafeIds?.length) return res.json({ rewards: [] });

    const rewards = await prisma.reward.findMany({
      where: {
        cafeId: { in: req.cafeIds },
        isActive: true
      },
      orderBy: { pointsCost: 'asc' }
    });

    res.json({ rewards });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/employee/dashboard
// ============================================================

employeeRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    if (!req.cafeIds?.length) return res.json({});

    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const [staff, todayStats, cafe] = await Promise.all([
      prisma.cafeStaff.findFirst({
        where: { userId: req.userId!, isActive: true },
        include: {
          cafe: true,
          branch: true
        }
      }),
      prisma.purchase.aggregate({
        _sum: { amount: true, pointsEarned: true },
        _count: true,
        where: {
          cafeId: { in: req.cafeIds },
          createdAt: { gte: today }
        }
      }),
      prisma.cafe.findFirst({
        where: { id: { in: req.cafeIds } },
        select: { name: true, logoUrl: true }
      })
    ]);

    res.json({
      staff,
      cafe,
      todayStats: {
        purchases: todayStats._count,
        revenue: todayStats._sum.amount || 0,
        pointsAwarded: todayStats._sum.pointsEarned || 0
      }
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});
