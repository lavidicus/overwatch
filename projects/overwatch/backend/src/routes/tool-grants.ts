import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

const createGrantSchema = z.object({
  toolId: z.string().uuid(),
  scope: z.enum(['ALL', 'SESSION']).default('ALL'),
  sessionId: z.string().uuid().optional(),
  argsMatch: z.record(z.unknown()).optional(),
});

/**
 * GET /api/tool-grants
 * List the current user's active (non-revoked) tool grants.
 */
router.get('/', authenticate, auditLog('LIST_TOOL_GRANTS'), async (req: AuthRequest, res): Promise<any> => {
  const grants = await prisma.userToolGrant.findMany({
    where: { userId: req.user!.id, revokedAt: null },
    include: { tool: { select: { id: true, name: true, category: true, description: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ grants });
});

/**
 * POST /api/tool-grants
 * Create (or re-activate) a grant for the current user.
 * Body: { toolId, scope?, sessionId?, argsMatch? }
 */
router.post('/', authenticate, auditLog('CREATE_TOOL_GRANT'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = createGrantSchema.parse(req.body);
    if (body.scope === 'SESSION' && !body.sessionId) {
      return res.status(400).json({ error: 'sessionId required when scope=SESSION' });
    }

    const tool = await prisma.tool.findUnique({ where: { id: body.toolId } });
    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    // If an identical (userId, toolId, scope, sessionId) grant already exists,
    // un-revoke it instead of duplicating. (We use findFirst because Prisma's
    // compound unique typing doesn't allow null sessionId here.)
    const existing = await prisma.userToolGrant.findFirst({
      where: {
        userId: req.user!.id,
        toolId: body.toolId,
        scope: body.scope,
        sessionId: body.sessionId ?? null,
      },
    });

    if (existing) {
      const updated = await prisma.userToolGrant.update({
        where: { id: existing.id },
        data: {
          revokedAt: null,
          argsMatch: (body.argsMatch ?? null) as any,
        },
        include: { tool: { select: { id: true, name: true, category: true, description: true } } },
      });
      return res.status(200).json({ grant: updated });
    }

    const grant = await prisma.userToolGrant.create({
      data: {
        userId: req.user!.id,
        toolId: body.toolId,
        scope: body.scope,
        sessionId: body.sessionId ?? null,
        argsMatch: (body.argsMatch ?? null) as any,
      },
      include: { tool: { select: { id: true, name: true, category: true, description: true } } },
    });
    res.status(201).json({ grant });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Create tool grant error:', err);
    return res.status(500).json({ error: 'Failed to create grant' });
  }
});

/**
 * DELETE /api/tool-grants/:id
 * Revoke a grant. We don't hard-delete so the audit trail is preserved.
 */
router.delete('/:id', authenticate, auditLog('REVOKE_TOOL_GRANT'), async (req: AuthRequest, res): Promise<any> => {
  const grant = await prisma.userToolGrant.findUnique({ where: { id: req.params.id as string } });
  if (!grant) return res.status(404).json({ error: 'Grant not found' });
  if (grant.userId !== req.user!.id) return res.status(403).json({ error: 'Not your grant' });
  if (grant.revokedAt) return res.status(400).json({ error: 'Already revoked' });
  const updated = await prisma.userToolGrant.update({
    where: { id: grant.id },
    data: { revokedAt: new Date() },
  });
  res.json({ grant: updated });
});

export default router;
