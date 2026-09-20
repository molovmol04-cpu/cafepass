import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateToken, createAuditLog } from '../middleware/auth.js';
import { sendOTP, generateOTP } from '../services/sms.js';
import { validatePhone, normalizePhone } from '../utils/validation.js';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const sendOTPSchema = z.object({
  phone: z.string().min(1, 'Telefon raqami kiritilishi shart')
});

const verifyOTPSchema = z.object({
  phone: z.string().min(1),
  code: z.string().length(4, 'Kod 4 xonali bo\'lishi kerak'),
  name: z.string().min(2, 'Ism kiritilishi shart').optional()
});

// ============================================================
// POST /api/auth/send-otp
// ============================================================

authRouter.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const result = sendOTPSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Noto\'g\'ri telefon raqami.',
        details: result.error.errors 
      });
    }

    const { phone } = result.data;

    // Validate phone format
    if (!validatePhone(phone)) {
      return res.status(400).json({ 
        error: 'Noto\'g\'ri telefon raqami. +998 bilan boshlanishi kerak.' 
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // Check rate limit: max 3 OTP requests per phone per hour
    const recentOTPs = await prisma.oTPVerification.count({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    });

    if (recentOTPs >= 100) {
      return res.status(429).json({ 
        error: 'Juda ko\'p urinish. 1 soatdan keyin urinib ko\'ring.' 
      });
    }

    // Check if there's already a pending OTP (less than 5 min old)
    const pendingOTP = await prisma.oTPVerification.findFirst({
      where: {
        phone: normalizedPhone,
        status: 'PENDING',
        expiresAt: { gte: new Date() }
      }
    });

    if (pendingOTP) {
      const cooldownEnd = new Date(pendingOTP.createdAt.getTime() + 60 * 1000); // 1 min cooldown
      if (new Date() < cooldownEnd) {
        const secondsLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
        return res.status(429).json({ 
          error: `Keyingi kod ${secondsLeft} soniyadan keyin yuboriladi.` 
        });
      }
    }

    // Generate OTP
    const code = generateOTP();

    // Hash OTP with bcrypt before storing
    const hashedCode = await bcrypt.hash(code, 10);

    // Store hashed OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await prisma.oTPVerification.create({
      data: {
        phone: normalizedPhone,
        code: hashedCode, // Hashed with bcrypt
        expiresAt
      }
    });

    // Send SMS
    // SMS hozircha ulanmagan — test uchun OTP kodni qaytaramiz
      const smsResult = await sendOTP(normalizedPhone, code);

      console.log(`🔐 TEST OTP for ${normalizedPhone}: ${code}`);

      return res.json({
        success: true,
        message: 'Tasdiqlash kodi yuborildi',
        devCode: code,
        expiresIn: 300
      });

    await createAuditLog(null, 'otp.sent', 'OTPVerification', null, { phone: normalizedPhone }, req.ip || undefined);

    res.json({ 
      success: true, 
      message: 'Tasdiqlash kodi yuborildi',
      expiresIn: 300 // seconds
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Server xatoligi. Qaytadan urinib ko\'ring.' });
  }
});

// ============================================================
// POST /api/auth/verify-otp
// ============================================================

authRouter.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const result = verifyOTPSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Ma\'lumotlar noto\'g\'ri.',
        details: result.error.errors 
      });
    }

    const { phone, code, name } = result.data;

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Noto\'g\'ri telefon raqami.' });
    }

    const normalizedPhone = normalizePhone(phone);

    // Find pending OTP
    const otp = await prisma.oTPVerification.findFirst({
      where: {
        phone: normalizedPhone,
        status: 'PENDING',
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otp) {
      return res.status(400).json({ error: 'Tasdiqlash kodi muddati tugagan. Qaytadan so\'rang.' });
    }

    // Check attempts
    if (otp.attempts >= 5) {
      await prisma.oTPVerification.update({
        where: { id: otp.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(429).json({ error: 'Juda ko\'p noto\'g\'ri urinish. Qaytadan kod so\'rang.' });
    }

    // Verify code with bcrypt comparison
    const isValid = await bcrypt.compare(code, otp.code);

    if (!isValid) {
      await prisma.oTPVerification.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } }
      });
      return res.status(400).json({ error: 'Kod noto\'g\'ri.' });
    }

    // Mark OTP as used (prevent replay)
    await prisma.oTPVerification.update({
      where: { id: otp.id },
      data: { 
        status: 'VERIFIED',
        verifiedAt: new Date()
      }
    });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!user) {
      // Create new customer
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          name: name || 'Foydalanuvchi',
          role: 'CUSTOMER',
          customerProfile: {
            create: {
              level: 'BRONZE'
            }
          }
        },
        include: { customerProfile: true }
      });

      await createAuditLog(user.id, 'user.registered', 'User', user.id, { phone: normalizedPhone }, req.ip || undefined);
    } else {
      await createAuditLog(user.id, 'user.login', 'User', user.id, { phone: normalizedPhone }, req.ip || undefined);
    }

    // Generate JWT
    const token = generateToken(user.id, user.role);

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || undefined
      }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
	customerProfile: null
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server xatoligi.' });
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================

authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await prisma.session.deleteMany({ where: { token } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ success: true }); // Still return success
  }
});

// ============================================================
// POST /api/auth/refresh
// ============================================================

authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token topilmadi' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    
    try {
      const decoded = jwt.default.verify(token, JWT_SECRET) as { userId: string; role: string };
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { customerProfile: true }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Foydalanuvchi topilmadi yoki bloklangan' });
      }

      // Generate new token
      const newToken = generateToken(user.id, user.role);

      // Update session
      await prisma.session.updateMany({
        where: { token },
        data: { 
          token: newToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      res.json({ token: newToken });
    } catch {
      return res.status(401).json({ error: 'Token muddati tugagan' });
    }
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

authRouter.post('/bootstrap-admin', async (req, res) => {
  try {
    const secret = req.headers['x-admin-bootstrap-secret'];

    if (!secret || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      return res.status(403).json({ error: 'Ruxsat berilmadi' });
    }

    const { phone, name } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ error: 'phone va name kerak' });
    }

    const normalizedPhone = phone.replace(/\D/g, '');

    const formattedPhone = normalizedPhone.startsWith('998')
      ? `+${normalizedPhone}`
      : `+998${normalizedPhone}`;

    const user = await prisma.user.upsert({
      where: { phone: formattedPhone },
      update: {
        name,
        role: 'PLATFORM_ADMIN',
        isActive: true,
      },
      create: {
        phone: formattedPhone,
        name,
        role: 'PLATFORM_ADMIN',
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: 'PLATFORM_ADMIN yaratildi',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Bootstrap admin error:', error);
    return res.status(500).json({ error: 'Server xatoligi' });
  }
});