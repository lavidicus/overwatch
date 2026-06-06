import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, ToolInvocationStatus } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { executeToolByName } from '../services/tools/index.js';

const router = Router();
const prisma = new PrismaClient();

const updateToolSchema = z.object({
  enabled: z.boolean().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  schema: z.record(z.unknown()).optional(),
});

const createToolSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1),
  category: z.string().default('custom'),
  schema: z.record(z.unknown()),
  enabled: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
});

/**
 * GET /api/tools — list all tools
 */
router.get('/', authenticate, auditLog('LIST_TOOLS'), async (_req: AuthRequest, res): Promise<any> => {
  const tools = await prisma.tool.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json({ tools });
});

/**
 * GET /api/tools/:id — fetch a single tool
 */
router.get('/:id', authenticate, async (req: AuthRequest, res): Promise<any> => {
  const tool = await prisma.tool.findUnique({ where: { id: req.params.id as string } });
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  res.json({ tool });
});

/**
 * POST /api/tools — register a custom tool (admin only)
 */
router.post('/', authenticate, auditLog('CREATE_TOOL'), async (req: AuthRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    const body = createToolSchema.parse(req.body);
    const tool = await prisma.tool.create({ data: { ...body, schema: body.schema as any } });
    res.status(201).json({ tool });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to create tool' });
  }
});

/**
 * PATCH /api/tools/:id — update a tool (admin only)
 */
router.patch('/:id', authenticate, auditLog('UPDATE_TOOL'), async (req: AuthRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    const body = updateToolSchema.parse(req.body);
    const data: Record<string, unknown> = { ...body };
    if (body.schema) data.schema = body.schema as any;
    const tool = await prisma.tool.update({ where: { id: req.params.id as string }, data });
    res.json({ tool });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to update tool' });
  }
});

/**
 * DELETE /api/tools/:id — remove a tool (admin only)
 */
router.delete('/:id', authenticate, auditLog('DELETE_TOOL'), async (req: AuthRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    await prisma.tool.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete tool' });
  }
});

/**
 * GET /api/tools/invocations — list recent invocations
 */
router.get('/invocations/all', authenticate, async (req: AuthRequest, res): Promise<any> => {
  const sessionId = req.query.sessionId as string | undefined;
  const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
  const invocations = await prisma.toolInvocation.findMany({
    where: { ...(sessionId ? { sessionId } : {}), userId: req.user!.id },
    include: { tool: { select: { name: true, category: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json({ invocations });
});

/**
 * POST /api/tools/invocations — create a pending invocation
 */
router.post('/invocations', authenticate, auditLog('CREATE_TOOL_INVOCATION'), async (req: AuthRequest, res): Promise<any> => {
  const body = z.object({
    toolId: z.string().uuid(),
    sessionId: z.string().uuid().optional(),
    args: z.record(z.unknown()),
  }).parse(req.body);

  const tool = await prisma.tool.findUnique({ where: { id: body.toolId } });
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  if (!tool.enabled) return res.status(403).json({ error: 'Tool disabled' });

  const status: ToolInvocationStatus = tool.requiresApproval ? 'PENDING' : 'APPROVED';
  const invocation = await prisma.toolInvocation.create({
    data: {
      toolId: body.toolId,
      sessionId: body.sessionId ?? null,
      userId: req.user!.id,
      args: body.args as any,
      status,
      approvedAt: status === 'APPROVED' ? new Date() : null,
    },
  });
  res.status(201).json({ invocation });
});

/**
 * POST /api/tools/invocations/:id/approve
 */
router.post('/invocations/:id/approve', authenticate, auditLog('APPROVE_TOOL_INVOCATION'), async (req: AuthRequest, res): Promise<any> => {
  const invocation = await prisma.toolInvocation.findUnique({ where: { id: req.params.id as string } });
  if (!invocation) return res.status(404).json({ error: 'Invocation not found' });
  if (invocation.status !== 'PENDING') return res.status(400).json({ error: `Invocation already ${invocation.status}` });
  const updated = await prisma.toolInvocation.update({
    where: { id: invocation.id },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });
  res.json({ invocation: updated });
});

/**
 * POST /api/tools/invocations/:id/reject
 */
router.post('/invocations/:id/reject', authenticate, auditLog('REJECT_TOOL_INVOCATION'), async (req: AuthRequest, res): Promise<any> => {
  const invocation = await prisma.toolInvocation.findUnique({ where: { id: req.params.id as string } });
  if (!invocation) return res.status(404).json({ error: 'Invocation not found' });
  if (invocation.status !== 'PENDING') return res.status(400).json({ error: `Invocation already ${invocation.status}` });
  const updated = await prisma.toolInvocation.update({
    where: { id: invocation.id },
    data: { status: 'REJECTED', completedAt: new Date() },
  });
  res.json({ invocation: updated });
});

/**
 * POST /api/tools/invocations/:id/execute
 * Run an approved invocation. Returns the result.
 */
router.post('/invocations/:id/execute', authenticate, auditLog('EXECUTE_TOOL_INVOCATION'), async (req: AuthRequest, res): Promise<any> => {
  const invocation = await prisma.toolInvocation.findUnique({
    where: { id: req.params.id as string },
    include: { tool: true },
  });
  if (!invocation) return res.status(404).json({ error: 'Invocation not found' });
  if (invocation.status !== 'APPROVED') return res.status(400).json({ error: `Invocation not approved (status: ${invocation.status})` });

  await prisma.toolInvocation.update({
    where: { id: invocation.id },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const args = (invocation.args ?? {}) as Record<string, unknown>;
  const result = await executeToolByName(invocation.tool.name, args);

  const updated = await prisma.toolInvocation.update({
    where: { id: invocation.id },
    data: {
      status: result.ok ? 'DONE' : 'FAILED',
      result: (result.result ?? null) as any,
      error: result.error ?? null,
      durationMs: result.durationMs,
      completedAt: new Date(),
    },
  });
  res.json({ invocation: updated, result });
});

export default router;
