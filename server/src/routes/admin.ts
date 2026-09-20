import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authorize, loadCafeAccess, createAuditLog } from '../middleware/auth.js';
import { validatePhone, normalizePhone, sanitizeString } from '../utils/validation.js';
import { prisma } from '../lib/prisma.js';

export const adminRouter = Router();

// All admin routes require PLATFORM_ADMIN role
adminRouter.use(authorize('PLATFORM_ADMIN'));

// ============================================================
// SCHEMAS
// ============================================================

const createCafeSchema = z.object({
  name: z.string().min(2, 'Kafe nomi kamida 2 belgidan iborat bo\'lishi kerak'),
  description: z.string().optional(),
  address: z.string().min(5, 'Manzil kiritilishi shart'),
  city: z.string().default('Namangan'),
  phone: z.string().min(1, 'Telefon raqami kiritilishi shart'),
  workingHours: z.string().default('08:00 — 22:00'),
  loyaltyRate: z.number().int().min(1).max(20).default(5),
  ownerName: z.string().min(2, 'Egasi ismi kiritilishi shart'),
  ownerPhone: z.string().min(1, 'Egasi telefoni kiritilishi shart'),
  branchName: z.string().min(2, 'Filial nomi kiritilishi shart'),
  branchAddress: z.string().min(5, 'Filial manzili kiritilishi shart')
});

// ============================================================
// GET /api/admin/dashboard
// ============================================================

adminRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [totalCafes, totalCustomers, totalEmployees, activeCafes, todayPurchases] = await Promise.all([
      prisma.cafe.count(),
      prisma.customerProfile.count(),
      prisma.cafeStaff.count({ where: { role: 'CAFE_EMPLOYEE' } }),
      prisma.cafe.count({ where: { status: 'ACTIVE' } }),
      prisma.purchase.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      })
    ]);

    const recentCafes = await prisma.cafe.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { branches: true }
    });

    res.json({
      stats: {
        totalCafes,
        totalCustomers,
        totalEmployees,
        activeCafes,
        todayPurchases
      },
      recentCafes
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/admin/cafes
// ============================================================

adminRouter.get('/cafes', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where = status ? { status: status as any } : {};

    const [cafes, total] = await Promise.all([
      prisma.cafe.findMany({
        where,
        include: {
          branches: true,
          staff: {
            include: { user: { select: { name: true, phone: true } } }
          },
          _count: {
            select: { purchases: true, staff: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.cafe.count({ where })
    ]);

    res.json({
      cafes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin cafes error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// POST /api/admin/cafes — Create café with owner and branch
// ============================================================

adminRouter.post('/cafes', async (req: Request, res: Response) => {
  try {
    const result = createCafeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Ma\'lumotlar noto\'g\'ri', details: result.error.errors });
    }

    const data = result.data;

    // Validate owner phone
    if (!validatePhone(data.ownerPhone)) {
      return res.status(400).json({ error: 'Egasi telefon raqami noto\'g\'ri' });
    }
    const normalizedOwnerPhone = normalizePhone(data.ownerPhone);

    // Validate cafe phone
    if (!validatePhone(data.phone)) {
      return res.status(400).json({ error: 'Kafe telefon raqami noto\'g\'ri' });
    }

    // Check if owner phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: normalizedOwnerPhone }
    });

    if (existingUser && existingUser.role !== 'CUSTOMER') {
      return res.status(400).json({ error: 'Bu telefon raqami bilan allaqachon hisob mavjud' });
    }

    // Create everything in a transaction
    const cafe = await prisma.$transaction(async (tx) => {
      // 1. Create or update owner user
      let ownerUser: any;
      if (existingUser) {
        ownerUser = await tx.user.update({
          where: { id: existingUser.id },
          data: { name: data.ownerName, role: 'CAFE_OWNER' }
        });
      } else {
        ownerUser = await tx.user.create({
          data: {
            phone: normalizedOwnerPhone,
            name: data.ownerName,
            role: 'CAFE_OWNER'
          }
        });
      }

      // 2. Create cafe
      const newCafe = await tx.cafe.create({
        data: {
          name: sanitizeString(data.name),
          description: data.description ? sanitizeString(data.description) : null,
          address: sanitizeString(data.address),
          city: data.city,
          phone: normalizePhone(data.phone),
          workingHours: data.workingHours,
          loyaltyRate: data.loyaltyRate,
          status: 'ACTIVE'
        }
      });

      // 3. Create branch
      await tx.cafeBranch.create({
        data: {
          cafeId: newCafe.id,
          name: sanitizeString(data.branchName),
          address: sanitizeString(data.branchAddress)
        }
      });

      // 4. Assign owner to cafe
      await tx.cafeStaff.create({
        data: {
          userId: ownerUser.id,
          cafeId: newCafe.id,
          role: 'CAFE_OWNER'
        }
      });

      return newCafe;
    });

    await createAuditLog(
      req.userId!,
      'cafe.created',
      'Cafe',
      cafe.id,
      { name: data.name, ownerPhone: normalizedOwnerPhone },
      req.ip || undefined
    );

    res.status(201).json({ success: true, cafe });
  } catch (error) {
    console.error('Create cafe error:', error);
    res.status(500).json({ error: 'Kafe yaratishda xatolik yuz berdi' });
  }
});

// ============================================================
// PATCH /api/admin/cafes/:cafeId
// ============================================================

adminRouter.patch('/cafes/:cafeId', async (req: Request, res: Response) => {
  try {
    const { cafeId } = req.params;
    const updates = req.body;

    const cafe = await prisma.cafe.update({
      where: { id: String(cafeId) },
      data: {
        name: updates.name ? sanitizeString(updates.name) : undefined,
        description: updates.description !== undefined ? sanitizeString(updates.description) : undefined,
        address: updates.address ? sanitizeString(updates.address) : undefined,
        city: updates.city,
        phone: updates.phone ? normalizePhone(updates.phone) : undefined,
        workingHours: updates.workingHours,
        loyaltyRate: updates.loyaltyRate,
        status: updates.status
      }
    });

    await createAuditLog(req.userId!, 'cafe.updated', 'Cafe', String(cafeId), updates, req.ip || undefined);

    res.json({ success: true, cafe });
  } catch (error) {
    console.error('Update cafe error:', error);
    res.status(500).json({ error: 'Kafeni yangilashda xatolik' });
  }
});

// ============================================================
// GET /api/admin/customers
// ============================================================

adminRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [customers, total] = await Promise.all([
      prisma.customerProfile.findMany({
        include: {
          user: { select: { name: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.customerProfile.count()
    ]);

    res.json({ customers, pagination: { page, limit, total } });
  } catch (error) {
    console.error('Admin customers error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/admin/analytics
// ============================================================

adminRouter.get('/analytics', async (req: Request, res: Response) => {
  try {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalRevenue, totalPurchases, totalPointsEarned, totalPointsRedeemed] = await Promise.all([
      prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: last30Days } }
      }),
      prisma.purchase.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.loyaltyTransaction.aggregate({
        _sum: { points: true },
        where: { type: 'EARN', createdAt: { gte: last30Days } }
      }),
      prisma.loyaltyTransaction.aggregate({
        _sum: { points: true },
        where: { type: 'REDEEM', createdAt: { gte: last30Days } }
      })
    ]);

    res.json({
      last30Days: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalPurchases,
        totalPointsEarned: totalPointsEarned._sum.points || 0,
        totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0)
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// ============================================================
// GET /api/admin/audit-logs
// ============================================================

adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          actor: { select: { name: true, phone: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count()
    ]);

    res.json({ logs, pagination: { page, limit, total } });
  } catch (error) {
    console.error('Admin audit logs error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});
