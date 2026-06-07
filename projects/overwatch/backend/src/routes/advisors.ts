import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getProviderClient } from '../services/providers/index.js';

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

const generateAdvisorSchema = z.object({
  instruction: z.string().min(1).max(2000),
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

/**
 * POST /api/advisors/generate — AI-assisted advisor profile generation
 *
 * Use a selected provider's model to generate a system prompt from a user's
 * instruction (e.g. "Create a security review advisor for cloud infrastructure").
 *
 * Body: { instruction, providerId?, model? }
 * Response: { generatedPrompt, usedProvider, usedModel }
 */
router.post('/generate', authenticate, async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = generateAdvisorSchema.parse(req.body);

    // Determine which provider/model to use
    let providerType = '';
    let usedModel = '';
    let client: any;

    if (body.providerId && body.model) {
      // Explicit provider + model
      const pm = await prisma.providerModel.findFirst({
        where: { providerId: body.providerId, name: body.model },
        include: { provider: true },
      });
      if (!pm?.provider) return res.status(404).json({ error: 'Provider/model not found' });
      client = await getProviderClient(pm.providerId);
      providerType = pm.provider.type;
      usedModel = body.model;
    } else {
      // Auto-select: first connected provider, first available model
      const provider = await prisma.provider.findFirst({
        where: { status: 'CONNECTED' },
        orderBy: { createdAt: 'asc' },
        take: 1,
      });
      if (!provider) {
        return res.status(400).json({ error: 'No connected providers available' });
      }
      const pm = await prisma.providerModel.findFirst({
        where: { providerId: provider.id, status: 'AVAILABLE' },
        orderBy: { name: 'asc' },
        take: 1,
      });
      if (!pm) {
        return res.status(400).json({ error: `Provider "${provider.name}" has no available models` });
      }
      client = await getProviderClient(provider.id);
      providerType = provider.type;
      usedModel = pm.name;
    }

    // Build the instruction for the AI
    const systemInstruction = `You are a specialized assistant that creates system prompts for AI advisors.

The user wants an advisor with the following description:

"${body.instruction}"

Generate a clear, concise system prompt that defines the advisor's role, behavior, expertise area, and any important guidelines. Keep it under 500 words. Format it as a plain text system prompt — do NOT wrap it in quotes or markdown.`;

    // Call the provider
    const result = await client.chatCompletion({
      messages: [
        { role: 'system' as const, content: systemInstruction },
        { role: 'user' as const, content: body.instruction },
      ],
      model: usedModel,
      maxTokens: 1000,
    });

    const generatedPrompt = result.content?.toString().trim() || '';

    if (!generatedPrompt) {
      return res.status(500).json({ error: 'Model returned empty response' });
    }

    return res.json({
      generatedPrompt,
      usedProvider: providerType,
      usedModel,
    });
  } catch (err: any) {
    console.error('[Advisor Generate] Error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate advisor profile',
    });
  }
});

export default router;
