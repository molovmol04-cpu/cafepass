import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import type { Role } from '@prisma/client';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      cafeIds?: string[]; // For owner/employee: which cafes they can access
    }
  }
}

// JWT_SECRET must be set in production
const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// Fallback only for development
const jwtSecret = JWT_SECRET || 'dev-secret-do-not-use-in-production';

/**
 * Authentication middleware — validates JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autentifikatsiya talab qilinadi' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; role: Role };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Noto\'g\'ri yoki muddati tugagan token' });
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Sizda bu bo\'limga kirish huquqi yo\'q' });
    }
    next();
  };
}

/**
 * Middleware to load cafe access for owner/employee
 */
export async function loadCafeAccess(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Autentifikatsiya talab qilinadi' });
    }

    const staff = await prisma.cafeStaff.findMany({
      where: { userId: req.userId, isActive: true },
      select: { cafeId: true }
    });

    req.cafeIds = staff.map((s: { cafeId: string }) => s.cafeId);
    next();
  } catch (error) {
    console.error('Load cafe access error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
}

/**
 * Middleware to verify cafe ownership/access
 */
export function verifyCafeAccess(paramName: string = 'cafeId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cafeId = req.params[paramName];
      
      if (!cafeId) {
        return res.status(400).json({ error: 'Kafe ID talab qilinadi' });
      }

      // Platform admin can access everything
      if (req.userRole === 'PLATFORM_ADMIN') {
        return next();
      }

      // Check if user has access to this cafe
      const staff = await prisma.cafeStaff.findFirst({
        where: {
          userId: req.userId,
          cafeId: String(cafeId),
          isActive: true
        }
      });

      if (!staff) {
        return res.status(403).json({ error: 'Sizda bu kafega kirish huquqi yo\'q' });
      }

      next();
    } catch (error) {
      console.error('Verify cafe access error:', error);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  };
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, role: Role): string {
  return jwt.sign({ userId, role }, jwtSecret, { expiresIn: '7d' });
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: any = null,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw — audit log failure shouldn't break the main operation
  }
}
