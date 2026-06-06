import { Router, Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticator } from 'otplib';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../middleware/audit.js';
import { authLimiter } from '../middleware/rateLimiter.js';

/**
 * Lightweight JWT verification for auth routes that need it.
 * Avoids importing the full authenticate middleware (circular dependency).
 */
function requireAuth(req: Request & { user?: any }, res: Response, next: NextFunction): void {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || (req.cookies as Record<string, string>)?.token;
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
}

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  displayName: z.string().min(1).max(100),
  department: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  mfaCode: z.string().length(6).optional(), // TOTP code if MFA enabled
});

const mfaSetupSchema = z.object({
  enable: z.boolean(),
  mfaCode: z.string().length(6).optional(), // Verification code when enabling
});

/**
 * Verify password - supports both argon2 and legacy pbkdf2 format
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Check if it's our legacy pbkdf2 format: $pbkdf2-sha512$iterations$salt$hash
  if (hash.startsWith('$pbkdf2-sha512$')) {
    const parts = hash.split('$');
    if (parts.length === 5) {
      const iterations = parseInt(parts[2], 10);
      const salt = parts[3];
      const expectedHash = parts[4];
      const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));
    }
  }
  // Otherwise use argon2
  return await argon2.verify(hash, password);
}

/**
 * POST /auth/register
 * Register a new user (admin-only for first user, then admin creates others)
 */
router.post('/register', authLimiter, auditLog('REGISTER'), async (req, res): Promise<any> => {
  try {
    const body = registerSchema.parse(req.body);

    // Check if this is the first user
    const userCount = await prisma.user.count();
    
    // For now, allow self-registration if no users exist
    // In production, this should be admin-only after first user
    if (userCount > 0) {
      return res.status(403).json({ 
        error: 'Registration is currently admin-only. Contact an administrator.' 
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password with argon2
    const passwordHash = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // Create user (first user is ADMIN)
    const user = await prisma.user.create({
      data: {
        email: body.email,
        displayName: body.displayName,
        passwordHash,
        role: userCount === 0 ? 'ADMIN' : 'USER',
        department: body.department,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Login and receive JWT token
 */
router.post('/login', authLimiter, auditLog('LOGIN'), async (req, res): Promise<any> => {
  try {
    const { email, password, mfaCode } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      // Generic error to prevent user enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with argon2 or legacy pbkdf2
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(401).json({ 
          error: 'MFA code required',
          mfaRequired: true 
        });
      }

      if (!user.mfaSecret) {
        return res.status(500).json({ error: 'MFA enabled but no secret found' });
      }

      const valid = authenticator.verify({
        token: mfaCode,
        secret: user.mfaSecret,
      });

      if (!valid) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRY || '8h') as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        department: user.department,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /auth/logout
 * Logout (client should discard token)
 */
router.post('/logout', auditLog('LOGOUT'), async (req, res): Promise<any> => {
  // JWT is stateless, so logout is client-side (discard token)
  // Could implement token blacklist in Redis if needed
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', requireAuth, auditLog('GET_ME'), async (req: any, res): Promise<any> => {
  try {
    // This route requires authentication middleware to be applied globally or per-route
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        department: true,
        mfaEnabled: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/mfa/setup
 * Enable or disable MFA for current user
 */
router.post('/mfa/setup', requireAuth, auditLog('MFA_SETUP'), async (req: any, res): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { enable, mfaCode } = mfaSetupSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (enable) {
      if (user.mfaEnabled) {
        return res.status(400).json({ error: 'MFA already enabled' });
      }

      // Generate TOTP secret
      const secret = authenticator.generateSecret();
      
      // If no verification code provided, return secret for setup
      if (!mfaCode) {
        const otpauthUrl = authenticator.keyuri(user.email, 'Overwatch', secret);
        return res.json({
          secret,
          otpauthUrl,
          message: 'Scan QR code and provide verification code',
        });
      }

      // Verify the code
      const valid = authenticator.verify({
        token: mfaCode,
        secret,
      });

      if (!valid) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Enable MFA
      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true, mfaSecret: secret },
      });

      res.json({ message: 'MFA enabled successfully' });
    } else {
      // Disable MFA
      if (!user.mfaEnabled) {
        return res.status(400).json({ error: 'MFA not enabled' });
      }

      // Require verification code to disable
      if (!mfaCode || !user.mfaSecret) {
        return res.status(400).json({ error: 'Verification code required' });
      }

      const valid = authenticator.verify({
        token: mfaCode,
        secret: user.mfaSecret,
      });

      if (!valid) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null },
      });

      res.json({ message: 'MFA disabled successfully' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

/**
 * GET /auth/mfa/qr
 * Get QR code URL for MFA setup (for users who need to re-scan)
 */
router.get('/mfa/qr', requireAuth, auditLog('MFA_QR'), async (req: any, res): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaSecret: true, mfaEnabled: true },
    });

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not configured' });
    }

    const otpauthUrl = authenticator.keyuri(user.email, 'Overwatch', user.mfaSecret);

    res.json({ otpauthUrl });
  } catch (error) {
    console.error('MFA QR error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

export default router;
