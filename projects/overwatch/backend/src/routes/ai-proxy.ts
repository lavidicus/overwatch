import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getProviderClient, invalidateClient } from '../services/providers/index.js';
import { ChatMessage } from '../services/providers/types.js';

const router = Router();
const prisma = new PrismaClient();

const chatBodySchema = z.object({
  providerId: z.string().uuid(),
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  stream: z.boolean().default(false),
});

const testSchema = z.object({
  providerId: z.string().uuid(),
  model: z.string().optional(),
  testMessage: z.string().optional(),
});

/**
 * POST /api/ai/chat/completions
 * OpenAI-compatible unified chat endpoint.
 * Forwards to the specified provider, returns SSE stream or JSON.
 */
router.post('/chat/completions', authenticate, auditLog('CHAT_PROXY'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = chatBodySchema.parse(req.body);

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: body.providerId, // will be set properly by chat.ts
        userId: req.user!.id,
        role: 'USER',
        content: body.messages[body.messages.length - 1]?.content || '',
        modelUsed: body.model,
      },
    });

    const client = await getProviderClient(body.providerId);
    const chatReq = {
      providerId: body.providerId,
      model: body.model,
      messages: body.messages as ChatMessage[],
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      stream: body.stream,
    };

    if (body.stream) {
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
            res.write(`data: ${JSON.stringify({
              id: `chatcmpl-${userMessage.id}`,
              object: 'chat.completion.chunk',
              created: Date.now(),
              model: body.model,
              choices: [{ index: 0, delta: { content: chunk.delta }, finish_reason: null }],
            })}\n\n`);
          }
        }

        // Final chunk
        res.write(`data: ${JSON.stringify({
          id: `chatcmpl-${userMessage.id}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: body.model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();

        // Save assistant message (async, don't block)
        prisma.chatMessage.create({
          data: {
            sessionId: body.providerId,
            userId: req.user!.id,
            role: 'ASSISTANT',
            content: fullContent,
            modelUsed: body.model,
          },
        }).catch(() => {});
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : String(err);
        res.write(`data: ${JSON.stringify({
          error: { message: errorText, type: 'provider_error' },
        })}\n\n`);
        res.end();
        // Save error as assistant message
        prisma.chatMessage.create({
          data: {
            sessionId: body.providerId,
            userId: req.user!.id,
            role: 'ASSISTANT',
            content: `Error: ${errorText}`,
            modelUsed: body.model,
          },
        }).catch(() => {});
      }
    } else {
      // Non-streaming
      const result = await client.chatCompletion(chatReq);

      await prisma.chatMessage.create({
        data: {
          sessionId: body.providerId,
          userId: req.user!.id,
          role: 'USER',
          content: body.messages[body.messages.length - 1]?.content || '',
          modelUsed: body.model,
        },
      });

      const assistantMsg = await prisma.chatMessage.create({
        data: {
          sessionId: body.providerId,
          userId: req.user!.id,
          role: 'ASSISTANT',
          content: result.content,
          modelUsed: body.model,
        },
        select: {
          id: true,
          role: true,
          content: true,
          modelUsed: true,
          createdAt: true,
        },
      });

      res.json({
        id: `chatcmpl-${assistantMsg.id}`,
        object: 'chat.completion',
        created: Date.now(),
        model: body.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: result.content },
          finish_reason: result.finishReason || 'stop',
        }],
        usage: {
          prompt_tokens: result.promptTokens,
          completion_tokens: result.completionTokens,
          total_tokens: result.totalTokens,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('AI proxy error:', error);
    res.status(500).json({ error: 'Chat proxy failed' });
  }
});

/**
 * POST /api/ai/test
 * Test connection to a provider.
 */
router.post('/test', authenticate, auditLog('TEST_PROVIDER'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = testSchema.parse(req.body);
    const client = await getProviderClient(body.providerId);
    const result = await client.testConnection();

    res.json({
      ok: result.ok,
      latencyMs: result.latencyMs,
      modelCount: (result as any).modelCount,
      error: result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.json({ ok: false, latencyMs: 0, error: message });
  }
});

export default router;
