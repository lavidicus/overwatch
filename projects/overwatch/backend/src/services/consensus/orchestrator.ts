/**
 * Multi-agent consensus orchestrator.
 *
 * Given a topic and a ChatGroup with AgentParticipants, runs a round-robin
 * discussion. After each round, asks a "judge" LLM whether consensus has
 * been reached. Loops up to `maxRounds` times.
 *
 * Designed to be UI-driven via Socket.io: emits per-agent progress events so
 * the frontend can stream the discussion as it unfolds.
 */

import { PrismaClient, ToolInvocationStatus } from '@prisma/client';
import { getProviderClient } from '../providers/index.js';
import { ChatMessage, ToolDefinition } from '../providers/types.js';
import { getIO } from '../../index.js';
import { executeToolByName } from '../tools/index.js';
import { findMatchingGrant } from '../tools/grants.js';
import { buildMemoryContext } from '../memory/service.js';

const prisma = new PrismaClient();

/** Max LLM iterations per agent turn when tool calling is enabled. */
const MAX_TOOL_ITERATIONS = 3;
/** Hard cap on how long we wait for a human approval (ms). */
const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;
/** Poll interval while waiting for approval (ms). */
const APPROVAL_POLL_MS = 1000;

interface AllowedTool {
  id: string;
  name: string;
  description: string;
  requiresApproval: boolean;
  schema: Record<string, unknown>;
}

interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  result?: unknown;
  error?: string;
  invocationId?: string;
  status: 'EXECUTED' | 'AUTO_REJECTED' | 'REJECTED' | 'TIMEOUT' | 'UNKNOWN_TOOL';
}

export type AgentRole = 'facilitator' | 'analyst' | 'critic' | 'advisor';

const DEFAULT_ROLE_PROMPTS: Record<string, string> = {
  facilitator:
    'You are the facilitator of a panel of AI advisors. Keep the discussion focused, ' +
    'summarize what others have said when useful, ask clarifying questions, and steer the ' +
    'group toward consensus. Be concise.',
  analyst:
    'You are an analytical advisor. Provide data-driven insights, evaluate options objectively, ' +
    'cite trade-offs, and avoid speculation when facts are available.',
  critic:
    'You are a critical advisor. Challenge assumptions, identify weaknesses in others\' reasoning, ' +
    'and surface risks that others may have missed. Be respectful but rigorous.',
  advisor:
    'You are a general advisor. Provide a thoughtful, well-reasoned response that contributes ' +
    'to reaching consensus with the rest of the panel.',
};

export interface OrchestratorOptions {
  groupId: string;
  topic: string;
  sessionId?: string | null;
  /** Override maxRounds from the group. */
  maxRounds?: number;
  /** Optional user id for logging. */
  userId?: string | null;
}

export interface AgentTurn {
  agentName: string;
  role: string;
  message: string;
  durationMs: number;
  error?: string | null;
  toolCalls?: ToolCallRecord[];
}

export interface RoundTranscript {
  roundId: string;
  roundNumber: number;
  turns: AgentTurn[];
  judgeAnalysis: string | null;
  reachedConsensus: boolean;
  finalConsensus: string | null;
}

export interface ConsensusResult {
  roundId: string;
  groupId: string;
  topic: string;
  status: 'REACHED_CONSENSUS' | 'FAILED' | 'IN_PROGRESS';
  finalConsensus: string | null;
  rounds: RoundTranscript[];
  totalRounds: number;
  startedAt: string;
  endedAt: string | null;
}

interface ResolvedAgent {
  id: string;
  agentName: string;
  role: string;
  systemPrompt: string;
  providerId: string;
  modelName: string;
  position: number;
}

interface JudgeConfig {
  providerId: string;
  modelName: string;
}

function emit(event: string, payload: unknown): void {
  try {
    const io = getIO();
    if (!io) return;
    const groupId = (payload as { groupId?: string }).groupId;
    if (groupId) io.to(`group:${groupId}`).emit(event, payload);
  } catch {
    /* socket emit must never crash the orchestrator */
  }
}

async function resolveAgents(groupId: string): Promise<ResolvedAgent[]> {
  const agents = await prisma.agentParticipant.findMany({
    where: { groupId, isActive: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  if (agents.length === 0) {
    throw new Error('No active agents in group');
  }

  const resolved: ResolvedAgent[] = [];
  for (const a of agents) {
    if (!a.providerId) {
      throw new Error(`Agent ${a.agentName} has no providerId configured`);
    }

    let modelName: string | null = null;
    if (a.modelId) {
      const m = await prisma.providerModel.findUnique({
        where: { id: a.modelId },
        select: { name: true },
      });
      modelName = m?.name ?? null;
    }
    if (!modelName) {
      const p = await prisma.provider.findUnique({
        where: { id: a.providerId },
        select: { model: true },
      });
      modelName = p?.model ?? null;
    }
    if (!modelName) {
      throw new Error(`Agent ${a.agentName} has no model configured`);
    }

    const sysPrompt =
      (a.systemPrompt && a.systemPrompt.trim().length > 0
        ? a.systemPrompt
        : DEFAULT_ROLE_PROMPTS[a.role] || DEFAULT_ROLE_PROMPTS.advisor) as string;

    resolved.push({
      id: a.id,
      agentName: a.agentName,
      role: a.role,
      systemPrompt: sysPrompt,
      providerId: a.providerId,
      modelName,
      position: a.position,
    });
  }
  return resolved;
}

async function resolveJudge(
  groupId: string,
  fallback: { providerId: string; modelName: string } | null,
): Promise<JudgeConfig | null> {
  const group = await prisma.chatGroup.findUnique({
    where: { id: groupId },
    select: { judgeProviderId: true, judgeModelId: true },
  });
  if (group?.judgeProviderId) {
    let modelName: string | null = null;
    if (group.judgeModelId) {
      const m = await prisma.providerModel.findUnique({
        where: { id: group.judgeModelId },
        select: { name: true },
      });
      modelName = m?.name ?? null;
    }
    if (!modelName) {
      const p = await prisma.provider.findUnique({
        where: { id: group.judgeProviderId },
        select: { model: true },
      });
      modelName = p?.model ?? null;
    }
    if (modelName) {
      return { providerId: group.judgeProviderId, modelName };
    }
  }
  return fallback;
}

function buildAgentMessages(
  topic: string,
  agent: ResolvedAgent,
  roundNumber: number,
  priorRounds: RoundTranscript[],
  currentRoundTurns: AgentTurn[],
  opts: { toolHint?: boolean; memoryContext?: string } = {},
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const now = new Date();
  const currentDate = now.toLocaleString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' UTC';
  
  const systemParts: string[] = [
    agent.systemPrompt,
    `You are participating as "${agent.agentName}" (role: ${agent.role}) in a multi-agent panel discussion. ` +
      `Other AI advisors will read what you say. Keep your contribution to 2-5 sentences unless detail is essential. ` +
      `Speak as yourself; do not pretend to be other panelists.`,
    `**Current Date/Time: ${currentDate}** - Use this to understand what "today", "this week", "latest", "recent", etc. mean.`,
  ];
  if (opts.toolHint) {
    systemParts.push(
      'CRITICAL: You have access to tools including web_search, web_fetch, and more. ' +
        'For ANY question about current prices, recent events, facts that could have changed, or real-world data: ' +
        'YOU MUST use web_search or appropriate tools BEFORE answering. Do NOT guess or use outdated knowledge. ' +
        'Example: If asked about prices, news, or current information, call web_search first. ' +
        'Only answer from your own knowledge for timeless topics (math, logic, general concepts). ' +
        'When you have gathered enough information from tools, then provide your panel contribution.',
    );
  }
  if (opts.memoryContext && opts.memoryContext.trim().length > 0) {
    systemParts.push(opts.memoryContext);
  }
  messages.push({
    role: 'system',
    content: systemParts.join('\n\n'),
  });

  // Provide topic + transcript so far.
  let transcript = `# Topic\n${topic}\n`;

  if (priorRounds.length > 0) {
    transcript += `\n# Prior rounds\n`;
    for (const r of priorRounds) {
      transcript += `\n## Round ${r.roundNumber}\n`;
      for (const t of r.turns) {
        transcript += `**${t.agentName}** (${t.role}): ${t.message}\n\n`;
      }
      if (r.judgeAnalysis) {
        transcript += `_Judge: ${r.judgeAnalysis}_\n`;
      }
    }
  }

  transcript += `\n# Round ${roundNumber} so far\n`;
  if (currentRoundTurns.length === 0) {
    transcript += `(You are speaking first this round.)\n`;
  } else {
    for (const t of currentRoundTurns) {
      transcript += `**${t.agentName}** (${t.role}): ${t.message}\n\n`;
    }
  }

  transcript +=
    `\nIt is now your turn as **${agent.agentName}** (${agent.role}). ` +
    `Respond to the topic, referencing or challenging earlier points where relevant. ` +
    `Do not include your name or role in the output — just the contribution itself.`;

  messages.push({ role: 'user', content: transcript });
  return messages;
}

function buildJudgeMessages(
  topic: string,
  rounds: RoundTranscript[],
): ChatMessage[] {
  const now = new Date();
  const currentDate = now.toLocaleString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' UTC';
  
  let transcript = `# Topic\n${topic}\n\n# Discussion so far\n`;
  transcript += `**Current Date/Time: ${currentDate}** - Use this to understand temporal references.\n\n`;
  for (const r of rounds) {
    transcript += `\n## Round ${r.roundNumber}\n`;
    for (const t of r.turns) {
      transcript += `**${t.agentName}** (${t.role}): ${t.message}\n\n`;
    }
  }
  return [
    {
      role: 'system',
      content:
        'You are an expert judge evaluating a panel discussion between AI advisors. Your task is to:\n' +
        '1. Review all arguments and points made by each panelist across all rounds\n' +
        '2. Identify the strongest reasoning and most well-supported conclusions\n' +
        '3. Synthesize the best answer or recommendation based on the collective discussion\n' +
        '4. Determine if the panel reached consensus (substantive agreement on the core conclusion)\n\n' +
        'Reply ONLY with valid JSON of the shape: ' +
        '`{"consensus": true|false, "summary": "<your definitive answer/best recommendation>", "rationale": "<brief explanation of your judgment>"}`.\n\n' +
        'The summary field should contain YOUR synthesis of the best answer or option - not just a summary of what the panel said. ' +
        'Even if the panel did not reach consensus, you must still provide a clear, actionable recommendation in the summary field.',
    },
    {
      role: 'user',
      content: transcript + '\n\nProvide your judgment as a JSON object. Remember: the summary field must contain your definitive answer or best recommendation.',
    },
  ];
}

interface JudgeVerdict {
  consensus: boolean;
  summary: string;
  rationale: string;
  raw: string;
}

function parseJudge(raw: string): JudgeVerdict {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : trimmed;
  // Find first '{' .. last '}' span.
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(candidate.slice(start, end + 1));
      return {
        consensus: Boolean(obj.consensus),
        summary: typeof obj.summary === 'string' ? obj.summary : '',
        rationale: typeof obj.rationale === 'string' ? obj.rationale : '',
        raw,
      };
    } catch {
      /* fall through */
    }
  }
  // Heuristic fallback.
  const lower = trimmed.toLowerCase();
  const reached =
    lower.includes('consensus reached') || /\bconsensus\b\s*[:=]?\s*true/.test(lower);
  return { consensus: reached, summary: trimmed, rationale: 'parse-fallback', raw };
}

async function loadAllowedTools(
  allowToolCalls: boolean,
  allowedToolIds: unknown,
): Promise<AllowedTool[]> {
  if (!allowToolCalls) return [];
  let idFilter: string[] | null = null;
  if (Array.isArray(allowedToolIds) && allowedToolIds.length > 0) {
    idFilter = (allowedToolIds as unknown[]).filter(
      (x): x is string => typeof x === 'string' && x.length > 0,
    );
    if (idFilter.length === 0) idFilter = null;
  }
  const rows = await prisma.tool.findMany({
    where: {
      enabled: true,
      ...(idFilter ? { id: { in: idFilter } } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      requiresApproval: true,
      schema: true,
    },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    requiresApproval: t.requiresApproval,
    schema: (t.schema ?? {}) as Record<string, unknown>,
  }));
}

function compactToolResult(result: unknown): string {
  try {
    const s = JSON.stringify(result);
    return s.length > 4000 ? s.slice(0, 4000) + '… [truncated]' : s;
  } catch {
    return String(result).slice(0, 4000);
  }
}

function toolsToDefinitions(tools: AllowedTool[]): ToolDefinition[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.schema,
  }));
}

async function waitForApprovalDecision(
  invocationId: string,
  timeoutMs: number,
): Promise<ToolInvocationStatus> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const inv = await prisma.toolInvocation.findUnique({
      where: { id: invocationId },
      select: { status: true },
    });
    if (!inv) return 'REJECTED';
    if (inv.status === 'APPROVED' || inv.status === 'REJECTED') return inv.status;
    // RUNNING/DONE/FAILED also resolve
    if (inv.status !== 'PENDING') return inv.status;
    await new Promise((r) => setTimeout(r, APPROVAL_POLL_MS));
  }
  return 'PENDING'; // signals timeout to caller
}

interface AgentToolContext {
  groupId: string;
  roundId: string;
  sessionId: string | null;
  userId: string | null;
  ownerId: string;
  requireApproval: boolean;
  position: number;
  tools: AllowedTool[];
  toolPositionRef: { value: number };
}

async function persistToolMessage(
  ctx: AgentToolContext,
  agentName: string,
  role: 'tool_call' | 'tool_result',
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.consensusMessage.create({
      data: {
        roundId: ctx.roundId,
        agentName,
        message: JSON.stringify(payload),
        role,
        position: ctx.toolPositionRef.value++,
      },
    });
  } catch (err) {
    console.warn('[consensus] failed to persist tool message:', (err as Error).message);
  }
}

/**
 * Run a single agent turn with optional tool-call iterations.
 * Returns the final assistant content plus tool-call metadata.
 */
async function callAgent(
  agent: ResolvedAgent,
  baseMessages: ChatMessage[],
  ctx: AgentToolContext | null,
): Promise<{
  content: string;
  durationMs: number;
  error?: string;
  toolCalls: ToolCallRecord[];
}> {
  const start = Date.now();
  const toolCallRecords: ToolCallRecord[] = [];
  const conversation: ChatMessage[] = [...baseMessages];
  try {
    const client = await getProviderClient(agent.providerId);
    const tools = ctx?.tools ?? [];
    const toolDefs = tools.length > 0 ? toolsToDefinitions(tools) : undefined;
    const toolByName = new Map(tools.map((t) => [t.name, t]));

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const res = await client.chatCompletion({
        providerId: agent.providerId,
        model: agent.modelName,
        messages: conversation,
        temperature: 0.7,
        maxTokens: 900,
        tools: toolDefs,
      });
      const callsRaw = res.toolCalls ?? [];

      // No tool calls → done.
      if (!ctx || callsRaw.length === 0) {
        const content = (res.content ?? '').trim() || '(no response)';
        return { content, durationMs: Date.now() - start, toolCalls: toolCallRecords };
      }

      conversation.push({
        role: 'assistant',
        content:
          (res.content && res.content.trim().length > 0)
            ? res.content
            : `[Requesting ${callsRaw.length} tool call(s): ${callsRaw.map((c) => c.name).join(', ')}]`,
      });

      for (const call of callsRaw) {
        const toolMeta = toolByName.get(call.name);
        const callPayload: Record<string, unknown> = {
          name: call.name,
          arguments: call.arguments,
        };

        if (!toolMeta) {
          await persistToolMessage(ctx, agent.agentName, 'tool_call', {
            ...callPayload,
            status: 'rejected',
            reason: 'tool_not_allowed',
          });
          emit('group:round:agent:tool_call', {
            groupId: ctx.groupId,
            sessionId: ctx.sessionId,
            roundId: ctx.roundId,
            agentName: agent.agentName,
            name: call.name,
            args: call.arguments,
            status: 'rejected',
            reason: 'tool_not_allowed',
          });
          toolCallRecords.push({
            name: call.name,
            args: call.arguments,
            ok: false,
            error: 'tool_not_allowed',
            status: 'UNKNOWN_TOOL',
          });
          conversation.push({
            role: 'user',
            content: `[Tool error] tool "${call.name}" is not available to this panel.`,
          });
          continue;
        }

        // Approval handling.
        const userIdForInvocation = ctx.userId ?? ctx.ownerId;
        let status: ToolInvocationStatus;
        if (ctx.requireApproval && toolMeta.requiresApproval) {
          const grantId = await findMatchingGrant({
            userId: userIdForInvocation,
            toolId: toolMeta.id,
            sessionId: ctx.sessionId,
            args: call.arguments,
          });
          status = grantId ? 'APPROVED' : 'PENDING';
        } else {
          status = 'APPROVED';
        }

        const inv = await prisma.toolInvocation.create({
          data: {
            toolId: toolMeta.id,
            sessionId: ctx.sessionId,
            userId: userIdForInvocation,
            args: call.arguments as unknown as object,
            status,
            approvedAt: status === 'APPROVED' ? new Date() : null,
          },
        });

        await persistToolMessage(ctx, agent.agentName, 'tool_call', {
          ...callPayload,
          invocationId: inv.id,
          status: status === 'APPROVED' ? 'auto-approved' : 'pending-approval',
          requiresApproval: toolMeta.requiresApproval,
        });
        emit('group:round:agent:tool_call', {
          groupId: ctx.groupId,
          sessionId: ctx.sessionId,
          roundId: ctx.roundId,
          agentName: agent.agentName,
          name: call.name,
          args: call.arguments,
          invocationId: inv.id,
          status: status === 'APPROVED' ? 'auto-approved' : 'pending-approval',
          requiresApproval: toolMeta.requiresApproval,
        });

        if (status === 'PENDING') {
          const decision = await waitForApprovalDecision(inv.id, APPROVAL_TIMEOUT_MS);
          if (decision === 'APPROVED') {
            status = 'APPROVED';
          } else if (decision === 'PENDING') {
            // timeout
            await prisma.toolInvocation.update({
              where: { id: inv.id },
              data: { status: 'REJECTED', completedAt: new Date(), error: 'approval timeout' },
            });
            toolCallRecords.push({
              name: call.name,
              args: call.arguments,
              ok: false,
              error: 'approval_timeout',
              invocationId: inv.id,
              status: 'TIMEOUT',
            });
            await persistToolMessage(ctx, agent.agentName, 'tool_result', {
              invocationId: inv.id,
              name: call.name,
              ok: false,
              error: 'approval_timeout',
            });
            emit('group:round:agent:tool_result', {
              groupId: ctx.groupId,
              sessionId: ctx.sessionId,
              roundId: ctx.roundId,
              agentName: agent.agentName,
              name: call.name,
              invocationId: inv.id,
              ok: false,
              error: 'approval_timeout',
            });
            conversation.push({
              role: 'user',
              content: `[Tool ${call.name}] approval timed out; the operator did not approve in time.`,
            });
            continue;
          } else if (decision === 'REJECTED') {
            toolCallRecords.push({
              name: call.name,
              args: call.arguments,
              ok: false,
              error: 'rejected',
              invocationId: inv.id,
              status: 'REJECTED',
            });
            await persistToolMessage(ctx, agent.agentName, 'tool_result', {
              invocationId: inv.id,
              name: call.name,
              ok: false,
              error: 'rejected',
            });
            emit('group:round:agent:tool_result', {
              groupId: ctx.groupId,
              sessionId: ctx.sessionId,
              roundId: ctx.roundId,
              agentName: agent.agentName,
              name: call.name,
              invocationId: inv.id,
              ok: false,
              error: 'rejected',
            });
            conversation.push({
              role: 'user',
              content: `[Tool ${call.name}] was rejected by the operator. Continue without it.`,
            });
            continue;
          } else {
            // Already RUNNING/DONE/FAILED from another path: treat as approved if not failed.
            status = decision === 'DONE' ? 'APPROVED' : decision;
          }
        }

        // Execute.
        await prisma.toolInvocation.update({
          where: { id: inv.id },
          data: { status: 'RUNNING', startedAt: new Date() },
        });
        const out = await executeToolByName(call.name, call.arguments);
        await prisma.toolInvocation.update({
          where: { id: inv.id },
          data: {
            status: out.ok ? 'DONE' : 'FAILED',
            result: (out.result ?? null) as unknown as Parameters<typeof prisma.toolInvocation.update>[0]['data']['result'],
            error: out.error ?? null,
            durationMs: out.durationMs,
            completedAt: new Date(),
          },
        });

        toolCallRecords.push({
          name: call.name,
          args: call.arguments,
          ok: out.ok,
          result: out.result,
          error: out.error,
          invocationId: inv.id,
          status: 'EXECUTED',
        });
        await persistToolMessage(ctx, agent.agentName, 'tool_result', {
          invocationId: inv.id,
          name: call.name,
          ok: out.ok,
          durationMs: out.durationMs,
          ...(out.ok ? { result: out.result } : { error: out.error }),
        });
        emit('group:round:agent:tool_result', {
          groupId: ctx.groupId,
          sessionId: ctx.sessionId,
          roundId: ctx.roundId,
          agentName: agent.agentName,
          name: call.name,
          invocationId: inv.id,
          ok: out.ok,
          durationMs: out.durationMs,
          result: out.ok ? out.result : undefined,
          error: out.error,
        });

        conversation.push({
          role: 'user',
          content: `[Tool result for ${call.name}]\n${compactToolResult(
            out.ok ? out.result : { error: out.error },
          )}`,
        });
      }
    }

    // Max iterations reached — ask the model for a final summary without tools.
    const final = await client.chatCompletion({
      providerId: agent.providerId,
      model: agent.modelName,
      messages: [
        ...conversation,
        {
          role: 'user',
          content:
            'You have reached the tool-call iteration limit. Provide your best answer ' +
            'now using only the information you have gathered so far. Do not call any more tools.',
        },
      ],
      temperature: 0.7,
      maxTokens: 700,
    });
    const content = (final.content ?? '').trim() || '(no response after tool iterations)';
    return { content, durationMs: Date.now() - start, toolCalls: toolCallRecords };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: `(error: ${msg})`,
      durationMs: Date.now() - start,
      error: msg,
      toolCalls: toolCallRecords,
    };
  }
}

async function callJudge(
  judge: JudgeConfig,
  messages: ChatMessage[],
): Promise<JudgeVerdict | null> {
  try {
    const client = await getProviderClient(judge.providerId);
    const res = await client.chatCompletion({
      providerId: judge.providerId,
      model: judge.modelName,
      messages,
      temperature: 0.1,
      maxTokens: 500,
    });
    return parseJudge(res.content || '');
  } catch (err) {
    console.warn('[consensus] judge call failed:', (err as Error).message);
    return null;
  }
}

export async function runConsensus(
  options: OrchestratorOptions,
): Promise<ConsensusResult> {
  const { groupId, topic, sessionId, userId } = options;
  const startedAt = new Date().toISOString();

  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new Error('Group not found');

  const agents = await resolveAgents(groupId);
  const maxRounds = options.maxRounds ?? group.maxRounds ?? 5;

  // Load allowed tools for this group.
  const allowedTools = await loadAllowedTools(
    Boolean((group as { allowToolCalls?: boolean }).allowToolCalls ?? true),
    (group as { allowedToolIds?: unknown }).allowedToolIds,
  );
  const requireApproval = Boolean(
    (group as { requireToolApproval?: boolean }).requireToolApproval ?? true,
  );
  const toolsEnabled = allowedTools.length > 0;

  // Judge defaults to the first agent's provider/model if not configured.
  const judge = await resolveJudge(groupId, {
    providerId: agents[0].providerId,
    modelName: agents[0].modelName,
  });

  // Reserve the next roundNumber for this group.
  const lastRound = await prisma.consensusRound.findFirst({
    where: { groupId },
    orderBy: { roundNumber: 'desc' },
    select: { roundNumber: true },
  });
  let nextRoundNumber = (lastRound?.roundNumber ?? 0) + 1;

  emit('group:consensus:start', {
    groupId,
    sessionId: sessionId ?? null,
    topic,
    agents: agents.map(a => ({ name: a.agentName, role: a.role })),
    maxRounds,
  });

  const rounds: RoundTranscript[] = [];
  let finalConsensus: string | null = null;
  let status: 'REACHED_CONSENSUS' | 'FAILED' = 'FAILED';
  let lastRoundId = '';

  for (let i = 0; i < maxRounds; i++) {
    const roundNumber = nextRoundNumber + i;
    const round = await prisma.consensusRound.create({
      data: {
        groupId,
        sessionId: sessionId ?? null,
        roundNumber,
        topic,
        status: 'IN_PROGRESS',
      },
    });
    lastRoundId = round.id;

    emit('group:round:start', { groupId, sessionId, roundId: round.id, roundNumber });

    const turns: AgentTurn[] = [];
    // Tool messages need unique positions inside the round; start them after
    // the agent response slots to avoid collisions.
    const toolPositionRef = { value: 10_000 };
    for (let idx = 0; idx < agents.length; idx++) {
      const agent = agents[idx];
      emit('group:round:agent:start', {
        groupId,
        sessionId,
        roundId: round.id,
        roundNumber,
        agentName: agent.agentName,
        role: agent.role,
        position: idx,
      });

      // Fetch RAG memory context for this agent turn. Non-fatal.
      let memoryContext = '';
      if (userId) {
        try {
          const memCtx = await buildMemoryContext(userId, topic, 4);
          memoryContext = memCtx.contextText || '';
        } catch (memErr) {
          console.warn(
            '[consensus] memory context failed:',
            (memErr as Error).message,
          );
        }
      }

      const prompt = buildAgentMessages(topic, agent, roundNumber, rounds, turns, {
        toolHint: toolsEnabled,
        memoryContext,
      });

      const ctx: AgentToolContext | null = toolsEnabled
        ? {
            groupId,
            roundId: round.id,
            sessionId: sessionId ?? null,
            userId: userId ?? null,
            ownerId: group.ownerId,
            requireApproval,
            position: idx,
            tools: allowedTools,
            toolPositionRef,
          }
        : null;

      const result = await callAgent(agent, prompt, ctx);

      const turn: AgentTurn = {
        agentName: agent.agentName,
        role: agent.role,
        message: result.content,
        durationMs: result.durationMs,
        error: result.error ?? null,
        toolCalls: result.toolCalls,
      };
      turns.push(turn);

      await prisma.consensusMessage.create({
        data: {
          roundId: round.id,
          agentName: agent.agentName,
          message: result.content,
          role: 'response',
          position: idx,
        },
      });

      emit('group:round:agent:complete', {
        groupId,
        sessionId,
        roundId: round.id,
        roundNumber,
        agentName: agent.agentName,
        role: agent.role,
        position: idx,
        message: result.content,
        durationMs: result.durationMs,
        error: result.error ?? null,
        toolCalls: result.toolCalls.map((c) => ({
          name: c.name,
          ok: c.ok,
          status: c.status,
          invocationId: c.invocationId,
        })),
      });
    }

    // Judge check.
    let verdict: JudgeVerdict | null = null;
    if (judge) {
      const pending: RoundTranscript = {
        roundId: round.id,
        roundNumber,
        turns,
        judgeAnalysis: null,
        reachedConsensus: false,
        finalConsensus: null,
      };
      verdict = await callJudge(judge, buildJudgeMessages(topic, [...rounds, pending]));
    }

    const judgeText = verdict
      ? `${verdict.consensus ? 'Consensus reached' : 'Judge evaluation'}: ${verdict.rationale}`
      : null;

    const reached = verdict?.consensus === true;
    // Always use the judge's synthesis as the final answer if available
    const finalAnswer = verdict?.summary || null;
    
    const transcript: RoundTranscript = {
      roundId: round.id,
      roundNumber,
      turns,
      judgeAnalysis: judgeText,
      reachedConsensus: reached,
      finalConsensus: finalAnswer,
    };
    rounds.push(transcript);

    await prisma.consensusRound.update({
      where: { id: round.id },
      data: {
        status: reached
          ? 'REACHED_CONSENSUS'
          : i === maxRounds - 1
            ? 'FAILED'
            : 'NO_CONSENSUS',
        finalConsensus: finalAnswer,
        judgeAnalysis: judgeText,
        endedAt: new Date(),
      },
    });

    emit('group:round:complete', {
      groupId,
      sessionId,
      roundId: round.id,
      roundNumber,
      reachedConsensus: reached,
      judgeAnalysis: judgeText,
      finalConsensus: finalAnswer,
    });

    if (reached) {
      finalConsensus = finalAnswer;
      status = 'REACHED_CONSENSUS';
      break;
    } else if (i === maxRounds - 1 && finalAnswer) {
      // On the last round, even without consensus, use the judge's synthesis as the final answer
      finalConsensus = finalAnswer;
      status = 'REACHED_CONSENSUS';
    }
  }

  const endedAt = new Date().toISOString();

  emit('group:consensus:complete', {
    groupId,
    sessionId,
    topic,
    status,
    finalConsensus,
    totalRounds: rounds.length,
  });

  // Best-effort: persist a user-visible chat message into the session log when
  // this run was invoked from a chat session.
  if (sessionId && userId) {
    try {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: 'ASSISTANT' as const,
          content:
            status === 'REACHED_CONSENSUS' && finalConsensus
              ? `**Panel consensus** (${rounds.length} round${rounds.length === 1 ? '' : 's'}):\n\n${finalConsensus}`
              : `Panel discussion ended after ${rounds.length} round${
                  rounds.length === 1 ? '' : 's'
                } without consensus. See transcript for details.`,
          modelUsed: 'consensus-orchestrator',
        },
      });
    } catch {
      /* non-fatal */
    }
  }

  return {
    roundId: lastRoundId,
    groupId,
    topic,
    status,
    finalConsensus,
    rounds,
    totalRounds: rounds.length,
    startedAt,
    endedAt,
  };
}
