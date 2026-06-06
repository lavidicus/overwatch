/**
 * Agent tool-calling loop.
 *
 * Given a chat session with tools enabled, run the model up to N iterations,
 * resolving tool calls along the way and feeding tool outputs back as
 * additional context. Stops when:
 *  - the model returns no tool calls (final answer ready)
 *  - max iterations reached
 *  - a tool needs approval (returns PENDING for human-in-the-loop)
 */

import { PrismaClient, ToolInvocationStatus } from '@prisma/client';
import { getProviderClient } from '../providers/index.js';
import { ChatMessage, ToolDefinition, ToolCallRequest } from '../providers/types.js';
import { executeToolByName } from './index.js';

const prisma = new PrismaClient();

export interface AgentLoopParams {
  sessionId: string;
  providerId: string;
  model: string;
  userId: string;
  messages: ChatMessage[];
  tools: Array<{ id: string; name: string; description: string; requiresApproval: boolean; schema: Record<string, unknown> }>;
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
  onIteration?: (event: AgentLoopEvent) => void;
}

export interface AgentLoopEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'pending_approval' | 'final' | 'error';
  iteration: number;
  data: Record<string, unknown>;
}

export interface AgentLoopResult {
  finalContent: string;
  iterations: number;
  invocationIds: string[];
  pending: boolean;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown; error?: string }>;
}

export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const max = params.maxIterations ?? 10;
  const client = await getProviderClient(params.providerId);

  const tools: ToolDefinition[] = params.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.schema,
  }));

  const conversation: ChatMessage[] = [...params.messages];
  const invocationIds: string[] = [];
  const toolCalls: AgentLoopResult['toolCalls'] = [];
  let finalContent = '';

  for (let i = 1; i <= max; i++) {
    params.onIteration?.({ type: 'thinking', iteration: i, data: {} });

    const result = await client.chatCompletion({
      providerId: params.providerId,
      model: params.model,
      messages: conversation,
      tools,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    finalContent = result.content || finalContent;

    // No tool calls → final answer
    if (!result.toolCalls || result.toolCalls.length === 0) {
      params.onIteration?.({ type: 'final', iteration: i, data: { content: result.content } });
      return { finalContent: result.content, iterations: i, invocationIds, pending: false, toolCalls };
    }

    // Append assistant message (preserve content + tool requests as JSON for the next turn)
    conversation.push({
      role: 'assistant',
      content: result.content || `[Requesting ${result.toolCalls.length} tool call(s)]`,
    });

    for (const call of result.toolCalls) {
      params.onIteration?.({ type: 'tool_call', iteration: i, data: { name: call.name, args: call.arguments } });

      const toolMeta = params.tools.find((t) => t.name === call.name);
      if (!toolMeta) {
        conversation.push({
          role: 'user',
          content: `[Tool error] tool "${call.name}" is not allowed in this session.`,
        });
        toolCalls.push({ name: call.name, args: call.arguments, result: null, error: 'tool_not_allowed' });
        continue;
      }

      // Pre-create the invocation row
      const status: ToolInvocationStatus = toolMeta.requiresApproval ? 'PENDING' : 'APPROVED';
      const inv = await prisma.toolInvocation.create({
        data: {
          toolId: toolMeta.id,
          sessionId: params.sessionId,
          userId: params.userId,
          args: call.arguments as any,
          status,
          approvedAt: status === 'APPROVED' ? new Date() : null,
        },
      });
      invocationIds.push(inv.id);

      if (status === 'PENDING') {
        params.onIteration?.({
          type: 'pending_approval',
          iteration: i,
          data: { invocationId: inv.id, name: call.name, args: call.arguments },
        });
        // Stop the loop. Caller resumes once user approves & re-invokes the endpoint.
        return {
          finalContent: finalContent || `Awaiting approval for tool: ${call.name}`,
          iterations: i,
          invocationIds,
          pending: true,
          toolCalls,
        };
      }

      // Execute now
      await prisma.toolInvocation.update({
        where: { id: inv.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      });
      const out = await executeToolByName(call.name, call.arguments);
      await prisma.toolInvocation.update({
        where: { id: inv.id },
        data: {
          status: out.ok ? 'DONE' : 'FAILED',
          result: (out.result ?? null) as any,
          error: out.error ?? null,
          durationMs: out.durationMs,
          completedAt: new Date(),
        },
      });

      const compactResult = compactToolResult(out.result ?? { error: out.error });
      conversation.push({
        role: 'user',
        content: `[Tool result for ${call.name}]\n${compactResult}`,
      });
      toolCalls.push({ name: call.name, args: call.arguments, result: out.result, error: out.error });
      params.onIteration?.({
        type: 'tool_result',
        iteration: i,
        data: { name: call.name, ok: out.ok, durationMs: out.durationMs },
      });
    }
  }

  return {
    finalContent: finalContent || 'Max iterations reached without a final answer.',
    iterations: max,
    invocationIds,
    pending: false,
    toolCalls,
  };
}

function compactToolResult(result: unknown): string {
  try {
    const s = JSON.stringify(result);
    return s.length > 4000 ? s.slice(0, 4000) + '… [truncated]' : s;
  } catch {
    return String(result).slice(0, 4000);
  }
}
