/**
 * Group-chat / multi-agent consensus API.
 *
 * A ChatGroup owns one or more AgentParticipants (AI advisors with roles).
 * Users start "consensus rounds" with a topic; the orchestrator runs the panel
 * and returns the transcript. Group chats can optionally be linked to a
 * ChatSession so the discussion appears in the regular chat UI.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { runConsensus } from '../services/consensus/orchestrator.js';

const router = Router();
const prisma = new PrismaClient();

const VALID_ROLES = ['facilitator', 'analyst', 'critic', 'advisor'] as const;

const agentSchema = z.object({
  agentName: z.string().min(1).max(120),
  providerId: z.string().uuid(),
  modelId: z.string().uuid().optional(),
  role: z.enum(VALID_ROLES).default('advisor'),
  systemPrompt: z.string().max(4000).nullish(),
  position: z.number().int().min(0).max(99).optional(),
  isActive: z.boolean().optional(),
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  maxRounds: z.number().int().min(1).max(10).optional(),
  judgeProviderId: z.string().uuid().optional(),
  judgeModelId: z.string().uuid().optional(),
  allowToolCalls: z.boolean().optional(),
  requireToolApproval: z.boolean().optional(),
  allowedToolIds: z.array(z.string().uuid()).nullable().optional(),
  agents: z.array(agentSchema).min(1).max(8),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  maxRounds: z.number().int().min(1).max(10).optional(),
  judgeProviderId: z.string().uuid().nullable().optional(),
  judgeModelId: z.string().uuid().nullable().optional(),
  allowToolCalls: z.boolean().optional(),
  requireToolApproval: z.boolean().optional(),
  allowedToolIds: z.array(z.string().uuid()).nullable().optional(),
  isActive: z.boolean().optional(),
  agents: z.array(agentSchema).max(8).optional(),
});

const consensusSchema = z.object({
  topic: z.string().min(1).max(8000),
  sessionId: z.string().uuid().optional(),
  maxRounds: z.number().int().min(1).max(10).optional(),
});

// ─────────────────────────── helpers ───────────────────────────

async function ownedGroup(id: string, userId: string) {
  return prisma.chatGroup.findFirst({ where: { id, ownerId: userId } });
}

async function serializeGroup(groupId: string) {
  const group = await prisma.chatGroup.findUnique({
    where: { id: groupId },
    include: {
      agents: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      rounds: {
        orderBy: { roundNumber: 'desc' },
        take: 1,
        select: {
          id: true,
          roundNumber: true,
          topic: true,
          status: true,
          finalConsensus: true,
          createdAt: true,
          endedAt: true,
        },
      },
      _count: { select: { rounds: true } },
    },
  });
  if (!group) return null;

  // Hydrate provider/model display info for agents.
  const providerIds = [
    ...new Set(
      group.agents.map(a => a.providerId).filter((x): x is string => Boolean(x)),
    ),
  ];
  const modelIds = [
    ...new Set(
      group.agents.map(a => a.modelId).filter((x): x is string => Boolean(x)),
    ),
  ];
  const [providers, models] = await Promise.all([
    providerIds.length
      ? prisma.provider.findMany({
          where: { id: { in: providerIds } },
          select: { id: true, name: true, type: true },
        })
      : Promise.resolve([]),
    modelIds.length
      ? prisma.providerModel.findMany({
          where: { id: { in: modelIds } },
          select: { id: true, name: true, displayName: true },
        })
      : Promise.resolve([]),
  ]);
  const pMap = new Map(providers.map(p => [p.id, p]));
  const mMap = new Map(models.map(m => [m.id, m]));

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    ownerId: group.ownerId,
    isActive: group.isActive,
    maxRounds: group.maxRounds,
    judgeProviderId: group.judgeProviderId,
    judgeModelId: group.judgeModelId,
    allowToolCalls: group.allowToolCalls,
    requireToolApproval: group.requireToolApproval,
    allowedToolIds: Array.isArray(group.allowedToolIds)
      ? (group.allowedToolIds as string[])
      : null,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    agents: group.agents.map(a => ({
      id: a.id,
      agentName: a.agentName,
      role: a.role,
      systemPrompt: a.systemPrompt,
      providerId: a.providerId,
      providerName: a.providerId ? pMap.get(a.providerId)?.name ?? null : null,
      modelId: a.modelId,
      modelName: a.modelId ? mMap.get(a.modelId)?.name ?? null : null,
      position: a.position,
      isActive: a.isActive,
    })),
    lastRound: group.rounds[0] ?? null,
    roundCount: group._count.rounds,
  };
}

// ─────────────────────────── routes ───────────────────────────

/**
 * GET /api/chat/groups
 * List groups owned by the current user.
 */
router.get(
  '/groups',
  authenticate,
  auditLog('LIST_CHAT_GROUPS'),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const userId = req.user!.id;
      const groups = await prisma.chatGroup.findMany({
        where: { ownerId: userId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        include: {
          agents: {
            select: { agentName: true, role: true },
            orderBy: { position: 'asc' },
          },
          _count: { select: { rounds: true, agents: true } },
        },
      });
      res.json({
        groups: groups.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          maxRounds: g.maxRounds,
          isActive: g.isActive,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
          agents: g.agents,
          agentCount: g._count.agents,
          roundCount: g._count.rounds,
        })),
      });
    } catch (err) {
      console.error('List groups error:', err);
      res.status(500).json({ error: 'Failed to list groups' });
    }
  },
);

/**
 * POST /api/chat/groups
 * Create a new group with agents.
 */
router.post(
  '/groups',
  authenticate,
  auditLog('CREATE_CHAT_GROUP'),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const body = createGroupSchema.parse(req.body);
      const userId = req.user!.id;

      // Validate provider/model ids exist.
      const providerIds = [...new Set(body.agents.map(a => a.providerId))];
      const provs = await prisma.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true },
      });
      if (provs.length !== providerIds.length) {
        return res.status(400).json({ error: 'One or more providerIds are invalid' });
      }

      const group = await prisma.$transaction(async tx => {
        const created = await tx.chatGroup.create({
          data: {
            name: body.name,
            description: body.description,
            ownerId: userId,
            maxRounds: body.maxRounds ?? 5,
            judgeProviderId: body.judgeProviderId,
            judgeModelId: body.judgeModelId,
            allowToolCalls: body.allowToolCalls ?? true,
            requireToolApproval: body.requireToolApproval ?? true,
            allowedToolIds: (body.allowedToolIds ?? null) as any,
          },
        });
        // Auto-add owner as a (human) member for symmetry with existing schema.
        await tx.chatGroupMember.create({
          data: { groupId: created.id, userId, role: 'OWNER' as const },
        });
        await tx.agentParticipant.createMany({
          data: body.agents.map((a, idx) => ({
            groupId: created.id,
            agentName: a.agentName,
            providerId: a.providerId,
            modelId: a.modelId,
            role: a.role,
            systemPrompt: a.systemPrompt,
            position: a.position ?? idx,
            isActive: a.isActive ?? true,
          })),
        });
        return created;
      });

      const result = await serializeGroup(group.id);
      res.status(201).json({ group: result });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      console.error('Create group error:', err);
      res.status(500).json({ error: 'Failed to create group' });
    }
  },
);

/**
 * GET /api/chat/groups/:id
 * Get full group detail (agents + last round).
 */
router.get(
  '/groups/:id',
  authenticate,
  auditLog('GET_CHAT_GROUP'),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const userId = req.user!.id;
      const group = await ownedGroup(req.params.id as string, userId);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      const result = await serializeGroup(group.id);
      res.json({ group: result });
    } catch (err) {
      console.error('Get group error:', err);
      res.status(500).json({ error: 'Failed to get group' });
    }
  },
);

/**
 * PATCH /api/chat/groups/:id
 * Update group; if `agents` is provided, the existing roster is replaced
 * atomically with the new one.
 */
router.patch(
  '/groups/:id',
  authenticate,
  auditLog('UPDATE_CHAT_GROUP'),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const body = updateGroupSchema.parse(req.body);
      const userId = req.user!.id;
      const existing = await ownedGroup(req.params.id as string, userId);
      if (!existing) return res.status(404).json({ error: 'Group not found' });

      await prisma.$transaction(async tx => {
        await tx.chatGroup.update({
          where: { id: existing.id },
          data: {
            name: body.name ?? undefined,
            description: body.description ?? undefined,
            maxRounds: body.maxRounds ?? undefined,
            judgeProviderId: body.judgeProviderId ?? undefined,
            judgeModelId: body.judgeModelId ?? undefined,
            allowToolCalls: body.allowToolCalls ?? undefined,
            requireToolApproval: body.requireToolApproval ?? undefined,
            allowedToolIds:
              body.allowedToolIds === undefined
                ? undefined
                : ((body.allowedToolIds ?? null) as any),
            isActive: body.isActive ?? undefined,
          },
        });
        if (body.agents) {
          await tx.agentParticipant.deleteMany({ where: { groupId: existing.id } });
          await tx.agentParticipant.createMany({
            data: body.agents.map((a, idx) => ({
              groupId: existing.id,
              agentName: a.agentName,
              providerId: a.providerId,
              modelId: a.modelId,
              role: a.role,
              systemPrompt: a.systemPrompt,
              position: a.position ?? idx,
              isActive: a.isActive ?? true,
            })),
          });
        }
      });

      const result = await serializeGroup(existing.id);
      res.json({ group: result });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      console.error('Update group error:', err);
      res.status(500).json({ error: 'Failed to update group' });
    }
  },
);

/**
 * DELETE /api/chat/groups/:id
 */
router.delete(
  '/groups/:id',
  authenticate,
  auditLog('DELETE_CHAT_GROUP'),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const userId = req.user!.id;
      const group = await ownedGroup(req.params.id as string, userId);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      await prisma.chatGroup.delete({ where: { id: group.id } });
      res.json({ ok: true });
    } catch (err) {
      console.error('Delete group error:', err);
      res.status(500).json({ error: 'Failed to delete group' });
    }
  },
);

/**
 * POST /api/chat/groups/:id/consensus
 * Run a consensus round. Returns the full transcript when finished.
 */
router.post(
  '/groups/:id/consensus',
  authenticate,
  auditLog('RUN_CHAT_CONSENSUS'),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const body = consensusSchema.parse(req.body);
      const userId = req.user!.id;
      const group = await ownedGroup(req.params.id as string, userId);
      if (!group) return res.status(404).json({ error: 'Group not found' });

      // If sessionId provided, verify ownership.
      if (body.sessionId) {
        const session = await prisma.chatSession.findFirst({
          where: { id: body.sessionId, userId },
        });
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }
        // Record the user's topic as a USER message in that session for the
        // chat log; the orchestrator will append the assistant summary.
        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            userId,
            role: 'USER' as const,
            content: body.topic,
            modelUsed: 'group-chat',
          },
        });
      }

      const result = await runConsensus({
        groupId: group.id,
        topic: body.topic,
        sessionId: body.sessionId ?? null,
        maxRounds: body.maxRounds,
        userId,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      console.error('Run consensus error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to run consensus',
      });
    }
  },
);

/**
 * GET /api/chat/groups/:id/history
 * Return all rounds + messages for the group.
 */
router.get(
  '/groups/:id/history',
  authenticate,
  auditLog('GET_CHAT_GROUP_HISTORY'),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const userId = req.user!.id;
      const group = await ownedGroup(req.params.id as string, userId);
      if (!group) return res.status(404).json({ error: 'Group not found' });

      const rounds = await prisma.consensusRound.findMany({
        where: { groupId: group.id },
        orderBy: { roundNumber: 'asc' },
        include: {
          messages: { orderBy: { position: 'asc' } },
        },
      });

      res.json({
        groupId: group.id,
        rounds: rounds.map(r => ({
          id: r.id,
          roundNumber: r.roundNumber,
          topic: r.topic,
          status: r.status,
          finalConsensus: r.finalConsensus,
          judgeAnalysis: r.judgeAnalysis,
          createdAt: r.createdAt,
          endedAt: r.endedAt,
          messages: r.messages.map(m => ({
            id: m.id,
            agentName: m.agentName,
            role: m.role,
            message: m.message,
            position: m.position,
            createdAt: m.createdAt,
          })),
        })),
      });
    } catch (err) {
      console.error('Get group history error:', err);
      res.status(500).json({ error: 'Failed to get history' });
    }
  },
);

/**
 * GET /api/chat/groups/agents/available
 * List provider models the user can pick when assembling a panel.
 * Returns ready (status=READY or RUNNING) models from active providers.
 */
router.get(
  '/groups/agents/available',
  authenticate,
  auditLog('LIST_AVAILABLE_AGENTS'),
  async (_req: AuthRequest, res): Promise<any> => {
    try {
      const models = await prisma.providerModel.findMany({
        where: {
          status: 'AVAILABLE' as const,
        },
        include: {
          provider: { select: { id: true, name: true, type: true, status: true } },
        },
        orderBy: { name: 'asc' },
      });
      res.json({
        models: models.map(m => ({
          modelId: m.id,
          modelName: m.name,
          displayName: m.displayName,
          providerId: m.providerId,
          providerName: m.provider.name,
          providerType: m.provider.type,
          providerStatus: m.provider.status,
        })),
      });
    } catch (err) {
      console.error('List available agents error:', err);
      res.status(500).json({ error: 'Failed to list available agents' });
    }
  },
);

export default router;
