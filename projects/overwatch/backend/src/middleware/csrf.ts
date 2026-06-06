import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF Protection Middleware
 * Validates CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API routes that use JWT authentication
  // (JWT provides sufficient protection for API endpoints)
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const token =
    req.headers['x-csrf-token'] ||
    req.headers['xsrf-token'] ||
    req.body?._csrf ||
    req.query._csrf;

  const sessionToken = req.cookies?.csrfToken;

  if (!token || !sessionToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken))) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  next();
};

/**
 * Middleware to attach CSRF token to response for cookie-based sessions
 */
export const attachCsrfToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate token if not already present
  if (!req.cookies?.csrfToken) {
    const token = generateCsrfToken();
    res.cookie('csrfToken', token, {
      httpOnly: false, // Must be readable by JavaScript for XHR
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies.csrfToken;
  }

  // Attach to response headers for SPA frameworks
  if (req.csrfToken) {
    res.setHeader('X-CSRF-Token', req.csrfToken);
  }

  next();
};

/**
 * Express middleware wrapper that combines token generation and validation
 */
export const csrf = {
  protect: csrfProtection,
  attach: attachCsrfToken,
  generate: generateCsrfToken,
};
