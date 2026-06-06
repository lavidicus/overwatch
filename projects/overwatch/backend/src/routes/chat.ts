import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, MessageRole } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getProviderClient } from '../services/providers/index.js';
import { getIO } from '../index.js';
import { ChatMessage } from '../services/providers/types.js';

const router = Router();
const prisma = new PrismaClient();

const createSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  providerId: z.string().uuid().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(50000),
  stream: z.boolean().default(false),
});

/**
 * GET /api/chat/sessions
 * List user's chat sessions (paginated).
 */
router.get('/sessions', authenticate, auditLog('LIST_CHAT_SESSIONS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

    const sessions = await prisma.chatSession.findMany({
      where: { userId, isActive: true },
      include: {
        _count: { select: { messages: true } },
        provider: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.chatSession.count({ where: { userId, isActive: true } });

    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.name,
        providerId: s.providerId,
        providerName: s.provider?.name,
        model: s.modelId,
        messageCount: s._count.messages,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
      })),
      pagination: { page, limit, total, hasMore: page * limit < total },
    });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * POST /api/chat/sessions
 * Create a new chat session.
 */
router.post('/sessions', authenticate, auditLog('CREATE_CHAT_SESSION'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = createSessionSchema.parse(req.body);

    const session = await prisma.chatSession.create({
      data: {
        userId: req.user!.id,
        name: body.title || null,
        providerId: body.providerId || null,
        modelId: body.model || null,
        systemPrompt: body.systemPrompt || null,
        temperature: body.temperature || null,
        maxTokens: body.maxTokens || null,
      },
      include: {
        provider: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    });

    res.status(201).json({
      id: session.id,
      title: session.name,
      providerId: session.providerId,
      providerName: session.provider?.name,
      model: session.modelId,
      messageCount: session._count.messages,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/chat/sessions/:id
 * Get session details + last N messages.
 */
router.get('/sessions/:id', authenticate, auditLog('GET_CHAT_SESSION'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const limit = Math.min(200, parseInt(req.query.limit as string) || 100);

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        provider: { select: { name: true } },
        model: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true, role: true, content: true, modelUsed: true, createdAt: true,
      },
    });

    res.json({
      id: session.id,
      title: session.name,
      providerId: session.providerId,
      providerName: session.provider?.name,
      model: session.modelId,
      systemPrompt: session.systemPrompt,
      temperature: session.temperature,
      maxTokens: session.maxTokens,
      messageCount: session._count.messages,
      messages,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * PATCH /api/chat/sessions/:id
 * Update session properties.
 */
router.patch('/sessions/:id', authenticate, auditLog('UPDATE_CHAT_SESSION'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const { title: t, providerId, model, systemPrompt, temperature, maxTokens, close } = req.body;

    const updateData: Record<string, unknown> = {};
    if (t !== undefined) updateData.name = t;
    if (providerId !== undefined) updateData.providerId = providerId;
    if (model !== undefined) updateData.modelId = model;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (close !== undefined) updateData.isActive = !close;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = await prisma.chatSession.update({
      where: { id: session.id },
      data: updateData,
    });

    res.json({ id: updated.id, title: updated.name });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

/**
 * DELETE /api/chat/sessions/:id
 * Delete session and all messages (cascade).
 */
router.delete('/sessions/:id', authenticate, auditLog('DELETE_CHAT_SESSION'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.chatSession.delete({ where: { id: session.id } });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

/**
 * Convert Prisma MessageRole enum to string for provider client
 */
function toProviderRole(role: MessageRole | string): 'system' | 'user' | 'assistant' {
  if (role === MessageRole.SYSTEM || role === 'SYSTEM') return 'system';
  if (role === MessageRole.USER || role === 'USER') return 'user';
  return 'assistant';
}

/**
 * POST /api/chat/sessions/:id/messages
 * Send a message and get AI reply. Core endpoint.
 */
router.post('/sessions/:id/messages', authenticate, auditLog('CHAT_SEND_MESSAGE'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const { content, stream } = sendMessageSchema.parse(req.body);

    // Verify session ownership with provider data
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        provider: { select: { id: true, type: true, baseUrl: true, port: true, model: true, apiKey: true, config: true } },
        model: { select: { name: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save user message immediately
    const userMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        userId,
        role: MessageRole.USER,
        content,
        modelUsed: session.modelId || undefined,
      },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    // Generate session title from first message
    const msgCount = await prisma.chatMessage.count({ where: { sessionId } });
    if (msgCount === 1 && !session.name) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { name: content.slice(0, 60) + (content.length > 60 ? '...' : '') },
      });
    }

    // Get full conversation context
    const allMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    const chatMessages: ChatMessage[] = [
      ...(session.systemPrompt ? [{ role: 'system' as const, content: session.systemPrompt }] : []),
      ...allMessages.map(m => ({ role: toProviderRole(m.role), content: m.content })),
      { role: 'user', content },
    ];

    const client = await getProviderClient(session.providerId!);
    const chatReq = {
      providerId: session.providerId!,
      model: session.modelId || session.provider!.model!,
      messages: chatMessages,
      temperature: session.temperature || undefined,
      maxTokens: session.maxTokens || undefined,
      stream,
    };

    // Emit typing indicator via Socket.io
    const io = getIO();
    if (io) {
      io.to(`chat:${sessionId}`).emit('chat:typing', { sessionId, userId: req.user!.id });
    }

    if (stream) {
      // SSE streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let fullContent = '';
      try {
        for await (const chunk of client.chatCompletionStream(chatReq)) {
          if (chunk.delta) {
            fullContent += chunk.delta;

            if (io) {
              io.to(`chat:${sessionId}`).emit('chat:message:delta', {
                sessionId,
                delta: chunk.delta,
                from: 'server',
              });
            }

            res.write(`data: ${JSON.stringify({
              id: `cmpl-${userMsg.id}`,
              object: 'chat.completion.chunk',
              created: Date.now(),
              model: chatReq.model,
              choices: [{ index: 0, delta: { content: chunk.delta }, finish_reason: null }],
            })}\n\n`);
          }
        }

        // Save assistant message
        const assistantMsg = await prisma.chatMessage.create({
          data: {
            sessionId,
            userId,
            role: MessageRole.ASSISTANT,
            content: fullContent,
            modelUsed: chatReq.model,
          },
          select: { id: true },
        });

        if (io) {
          io.to(`chat:${sessionId}`).emit('chat:message:complete', {
            sessionId,
            messageId: assistantMsg.id,
            content: fullContent,
          });
        }

        res.write(`data: ${JSON.stringify({
          id: `cmpl-${assistantMsg.id}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: chatReq.model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : String(err);

        if (io) {
          io.to(`chat:${sessionId}`).emit('chat:error', {
            sessionId,
            error: errorText,
          });
        }

        res.write(`data: ${JSON.stringify({ error: { message: errorText, type: 'provider_error' } })}\n\n`);
        res.end();

        prisma.chatMessage.create({
          data: {
            sessionId,
            userId,
            role: MessageRole.ASSISTANT,
            content: `Error: ${errorText}`,
            modelUsed: chatReq.model,
          },
        }).catch(() => {});
      }
    } else {
      // Non-streaming
      const result = await client.chatCompletion(chatReq);

      const assistantMsg = await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: MessageRole.ASSISTANT,
          content: result.content,
          modelUsed: chatReq.model,
        },
        select: { id: true, role: true, content: true, modelUsed: true, createdAt: true },
      });

      if (io) {
        io.to(`chat:${sessionId}`).emit('chat:message:complete', {
          sessionId,
          messageId: assistantMsg.id,
          content: assistantMsg.content,
        });
      }

      res.json({
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        usage: {
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.totalTokens,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/chat/sessions/:id/messages
 * Get paginated message history.
 */
router.get('/sessions/:id/messages', authenticate, auditLog('GET_CHAT_MESSAGES'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;

    const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, parseInt(req.query.limit as string) || 100);

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, role: true, content: true, modelUsed: true, createdAt: true },
      }),
      prisma.chatMessage.count({ where: { sessionId } }),
    ]);

    res.json({
      messages,
      pagination: { page, limit, total, hasMore: page * limit < total },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

export default router;
