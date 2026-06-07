import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

const createAdvisorSchema = z.object({
  name: z.string().min(1).max(100),
  systemPrompt: z.string().min(1).max(50000),
  providerId: z.string().uuid().optional().nullable(),
  model: z.string().optional().nullable(),
});

const updateAdvisorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  systemPrompt: z.string().min(1).max(50000).optional(),
  providerId: z.string().uuid().optional().nullable(),
  model: z.string().optional().nullable(),
});

/**
 * GET /api/advisors — list all advisor profiles
 */
router.get('/', authenticate, auditLog('LIST_ADVISORS'), async (_req: AuthRequest, res): Promise<any> => {
  const advisors = await prisma.advisorProfile.findMany({
    include: { provider: { select: { id: true, name: true, type: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });
  res.json({ advisors });
});

/**
 * GET /api/advisors/:id — get single advisor profile
 */
router.get('/:id', authenticate, async (req: AuthRequest, res): Promise<any> => {
  const advisor = await prisma.advisorProfile.findUnique({
    where: { id: req.params.id as string },
    include: { provider: { select: { id: true, name: true, type: true } } },
  });
  if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
  res.json({ advisor });
});

/**
 * POST /api/advisors — create new advisor profile
 */
router.post('/', authenticate, auditLog('CREATE_ADVISOR'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = createAdvisorSchema.parse(req.body);
    const advisor = await prisma.advisorProfile.create({
      data: { ...body },
      include: { provider: { select: { id: true, name: true, type: true } } },
    });
    res.status(201).json({ advisor });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Failed to create advisor:', err);
    return res.status(500).json({ error: 'Failed to create advisor' });
  }
});

/**
 * PATCH /api/advisors/:id — update advisor profile
 */
router.patch('/:id', authenticate, auditLog('UPDATE_ADVISOR'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = updateAdvisorSchema.parse(req.body);
    const advisor = await prisma.advisorProfile.update({
      where: { id: req.params.id as string },
      data: body,
      include: { provider: { select: { id: true, name: true, type: true } } },
    });
    res.json({ advisor });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    if ((err as any).code === 'P2025') return res.status(404).json({ error: 'Advisor not found' });
    console.error('Failed to update advisor:', err);
    return res.status(500).json({ error: 'Failed to update advisor' });
  }
});

/**
 * DELETE /api/advisors/:id — delete advisor profile
 */
router.delete('/:id', authenticate, auditLog('DELETE_ADVISOR'), async (req: AuthRequest, res): Promise<any> => {
  try {
    await prisma.advisorProfile.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (err) {
    if ((err as any).code === 'P2025') return res.status(404).json({ error: 'Advisor not found' });
    console.error('Failed to delete advisor:', err);
    return res.status(500).json({ error: 'Failed to delete advisor' });
  }
});

export default router;
