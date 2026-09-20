import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { ownerRouter } from './routes/owner.js';
import { employeeRouter } from './routes/employee.js';
import { customerRouter } from './routes/customer.js';
import { authenticate } from './middleware/auth.js';
import { prisma } from './lib/prisma.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://cafepass-six.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin ruxsat etilmagan'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Juda ko\'p so\'rov. Iltimos, keyinroq urinib ko\'ring.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 OTP requests per 15 minutes
  message: { error: 'OTP uchun juda ko\'p urinish. 15 daqiqadan keyin urinib ko\'ring.' }
});
app.use('/api/auth/', authLimiter);

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/admin', authenticate, adminRouter);
app.use('/api/owner', authenticate, ownerRouter);
app.use('/api/employee', authenticate, employeeRouter);
app.use('/api/customer', authenticate, customerRouter);

// Get current user
app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        customerProfile: true,
        cafeStaff: {
          include: {
            cafe: true,
            branch: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint topilmadi' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server xatoligi' });
});

// ============================================================
// START SERVER
// ============================================================

async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 CaféPass API server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
