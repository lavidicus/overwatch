import { Router, Request, Response } from 'express';
import { generateCsrfToken } from '../middleware/csrf.js';

const router = Router();

/**
 * GET /csrf/token
 * Get a fresh CSRF token for the session
 */
router.get('/token', (req: Request, res: Response) => {
  const token = generateCsrfToken();
  
  // Set as HTTP-only cookie
  res.cookie('csrfToken', token, {
    httpOnly: false, // Must be readable by JavaScript for XHR
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.json({ csrfToken: token });
});

export default router;
