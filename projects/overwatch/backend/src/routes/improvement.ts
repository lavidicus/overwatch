import { Router, Response } from 'express';
import { z } from 'zod';
import {
  PrismaClient,
  ChangeStatus,
  ChangeCategory,
  ChangePriority,
} from '@prisma/client';
import { AuthRequest, requireRole, Role } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { runAnalysis } from '../services/improvement/engine.js';

const router = Router();
export const proposalsRouter = Router();
const prisma = new PrismaClient();

/** POST /api/improvement/analyze — trigger analysis (OPERATOR+) */
router.post('/analyze', requireRole(Role.OPERATOR, Role.ADMIN), auditLog('IMPROVEMENT_ANALYZE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const report = await runAnalysis(req.user!.id);
    res.json(report);
  } catch (err) {
    console.error('improvement analyze error:', err);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
});

/** GET /api/improvement/health — quick aggregated health overview */
router.get('/health', async (_req: AuthRequest, res: Response): Promise<any> => {
  try {
    const [providers, openProposals, recentBench] = await Promise.all([
      prisma.provider.findMany({ select: { id: true, name: true, status: true, latencyMs: true, lastChecked: true } }),
      prisma.changeProposal.count({ where: { status: { in: [ChangeStatus.DRAFT, ChangeStatus.UNDER_REVIEW] } } }),
      prisma.benchmarkRun.count({ where: { status: 'COMPLETED', completedAt: { gte: new Date(Date.now() - 7 * 86400_000) } } }),
    ]);
    const onlineCount = providers.filter((p) => p.status === 'CONNECTED').length;
    res.json({
      providers: { total: providers.length, online: onlineCount, items: providers },
      openProposals,
      benchmarksLast7d: recentBench,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('improvement health error:', err);
    res.status(500).json({ error: 'Failed to load health overview' });
  }
});

// ----- Change proposals -----

const listQuerySchema = z.object({
  status: z.nativeEnum(ChangeStatus).optional(),
  category: z.nativeEnum(ChangeCategory).optional(),
  priority: z.nativeEnum(ChangePriority).optional(),
});

/** GET /api/change-proposals */
proposalsRouter.get('/', auditLog('LIST_CHANGE_PROPOSALS'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const q = listQuerySchema.parse({
      status: req.query.status as any,
      category: req.query.category as any,
      priority: req.query.priority as any,
    });
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.category) where.category = q.category;
    if (q.priority) where.priority = q.priority;
    const proposals = await prisma.changeProposal.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    res.json({ proposals });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('list proposals error:', err);
    res.status(500).json({ error: 'Failed to list change proposals' });
  }
});

/** GET /api/change-proposals/:id */
proposalsRouter.get('/:id', auditLog('GET_CHANGE_PROPOSAL'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const p = await prisma.changeProposal.findUnique({
      where: { id: req.params.id as string },
      include: {
        comments: { include: { user: { select: { id: true, displayName: true, email: true } } }, orderBy: { createdAt: 'asc' } },
        versions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!p) return res.status(404).json({ error: 'Change proposal not found' });
    res.json({ proposal: p });
  } catch (err) {
    console.error('get proposal error:', err);
    res.status(500).json({ error: 'Failed to get change proposal' });
  }
});

/** POST /api/change-proposals/:id/approve (ADMIN) */
proposalsRouter.post('/:id/approve', requireRole(Role.ADMIN), auditLog('APPROVE_CHANGE_PROPOSAL'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.changeProposal.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Change proposal not found' });
    if (existing.status === ChangeStatus.DEPLOYED) return res.status(400).json({ error: 'Already deployed' });
    if (existing.status === ChangeStatus.REJECTED) return res.status(400).json({ error: 'Already rejected' });
    const updated = await prisma.changeProposal.update({
      where: { id },
      data: { status: ChangeStatus.APPROVED, deployedByUserId: req.user!.id, deployedAt: new Date() },
    });
    res.json({ proposal: updated });
  } catch (err) {
    console.error('approve proposal error:', err);
    res.status(500).json({ error: 'Failed to approve proposal' });
  }
});

/** POST /api/change-proposals/:id/reject (ADMIN) */
proposalsRouter.post('/:id/reject', requireRole(Role.ADMIN), auditLog('REJECT_CHANGE_PROPOSAL'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const body = z.object({ reason: z.string().max(1000).optional() }).parse(req.body || {});
    const existing = await prisma.changeProposal.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Change proposal not found' });
    const updated = await prisma.changeProposal.update({
      where: { id },
      data: {
        status: ChangeStatus.REJECTED,
        rollbackReason: body.reason ?? null,
        deployedByUserId: req.user!.id,
        deployedAt: new Date(),
      },
    });
    res.json({ proposal: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('reject proposal error:', err);
    res.status(500).json({ error: 'Failed to reject proposal' });
  }
});

/** POST /api/change-proposals/:id/comment */
proposalsRouter.post('/:id/comment', auditLog('COMMENT_CHANGE_PROPOSAL'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const body = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);
    const proposal = await prisma.changeProposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ error: 'Change proposal not found' });
    const comment = await prisma.changeComment.create({
      data: {
        proposalId: id,
        userId: req.user!.id,
        comment: body.content,
      },
    });
    res.status(201).json({ comment });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('comment proposal error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
