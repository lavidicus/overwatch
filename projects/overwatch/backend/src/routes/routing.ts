import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, RouterMode } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { simulateRoute, pickRoute } from '../services/routing/engine.js';

const router = Router();
const prisma = new PrismaClient();

const ruleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(0),
  condition: z.record(z.unknown()).optional(),
  targetProviderId: z.string().uuid().optional(),
  targetModelId: z.string().uuid().optional(),
  routerMode: z.enum(['ROUND_ROBIN', 'WEIGHTED', 'LOWEST_LATENCY', 'HIGHEST_QUALITY', 'CUSTOM']).optional(),
  weight: z.number().int().min(0).max(100).default(50),
});

/**
 * GET /api/routing/rules
 */
router.get('/rules', authenticate, async (_req: AuthRequest, res): Promise<any> => {
  const rules = await prisma.routingRule.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
  res.json({ rules });
});

router.get('/rules/:id', authenticate, async (req: AuthRequest, res): Promise<any> => {
  const rule = await prisma.routingRule.findUnique({ where: { id: req.params.id as string } });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ rule });
});

router.post('/rules', authenticate, auditLog('CREATE_ROUTING_RULE'), async (req: AuthRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    const body = ruleSchema.parse(req.body);
    const rule = await prisma.routingRule.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        enabled: body.enabled,
        priority: body.priority,
        condition: (body.condition ?? null) as any,
        targetProviderId: body.targetProviderId ?? null,
        targetModelId: body.targetModelId ?? null,
        routerMode: (body.routerMode as RouterMode) ?? null,
        weight: body.weight,
      },
    });
    res.status(201).json({ rule });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

router.patch('/rules/:id', authenticate, auditLog('UPDATE_ROUTING_RULE'), async (req: AuthRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    const body = ruleSchema.partial().parse(req.body);
    const data: Record<string, unknown> = { ...body };
    if (body.condition !== undefined) data.condition = body.condition as any;
    if (body.routerMode !== undefined) data.routerMode = body.routerMode as RouterMode;
    const rule = await prisma.routingRule.update({ where: { id: req.params.id as string }, data });
    res.json({ rule });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

router.delete('/rules/:id', authenticate, auditLog('DELETE_ROUTING_RULE'), async (req: AuthRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    await prisma.routingRule.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

/**
 * POST /api/routing/simulate
 * Body: { prompt, hints? }
 * Returns the matching rule plus a full evaluation log.
 */
router.post('/simulate', authenticate, async (req: AuthRequest, res): Promise<any> => {
  const body = z.object({
    prompt: z.string().min(1),
    hints: z.record(z.unknown()).optional(),
  }).parse(req.body);
  const ctx = { prompt: body.prompt, hints: body.hints as any };
  const [decision, trace] = await Promise.all([pickRoute(ctx), simulateRoute(ctx)]);
  res.json({ decision, trace });
});

export default router;
