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

import { PrismaClient } from '@prisma/client';
import { getProviderClient } from '../providers/index.js';
import { ChatMessage } from '../providers/types.js';
import { getIO } from '../../index.js';

const prisma = new PrismaClient();

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
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  messages.push({
    role: 'system',
    content:
      `${agent.systemPrompt}\n\n` +
      `You are participating as "${agent.agentName}" (role: ${agent.role}) in a multi-agent panel discussion. ` +
      `Other AI advisors will read what you say. Keep your contribution to 2-5 sentences unless detail is essential. ` +
      `Speak as yourself; do not pretend to be other panelists.`,
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
  let transcript = `# Topic\n${topic}\n\n# Discussion so far\n`;
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
        'You are an impartial judge evaluating whether a panel of AI advisors has reached consensus ' +
        'on a topic. Reply ONLY with valid JSON of the shape ' +
        '`{"consensus": true|false, "summary": "<one-paragraph synthesis>", "rationale": "<short justification>"}`. ' +
        'If the panel has reached substantive agreement on the core question, set consensus=true and put the ' +
        'agreed answer in summary. Otherwise set consensus=false and explain what they still disagree on.',
    },
    {
      role: 'user',
      content: transcript + '\n\nHas the panel reached consensus? Respond with the JSON object only.',
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

async function callAgent(
  agent: ResolvedAgent,
  messages: ChatMessage[],
): Promise<{ content: string; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await getProviderClient(agent.providerId);
    const res = await client.chatCompletion({
      providerId: agent.providerId,
      model: agent.modelName,
      messages,
      temperature: 0.7,
      maxTokens: 700,
    });
    return { content: res.content?.trim() || '(no response)', durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: `(error: ${msg})`, durationMs: Date.now() - start, error: msg };
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

      const prompt = buildAgentMessages(topic, agent, roundNumber, rounds, turns);
      const result = await callAgent(agent, prompt);

      const turn: AgentTurn = {
        agentName: agent.agentName,
        role: agent.role,
        message: result.content,
        durationMs: result.durationMs,
        error: result.error ?? null,
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
      ? `${verdict.consensus ? 'Consensus reached' : 'No consensus'}: ${verdict.rationale}`
      : null;

    const reached = verdict?.consensus === true;
    const transcript: RoundTranscript = {
      roundId: round.id,
      roundNumber,
      turns,
      judgeAnalysis: judgeText,
      reachedConsensus: reached,
      finalConsensus: reached ? verdict?.summary || null : null,
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
        finalConsensus: reached ? verdict?.summary || null : null,
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
      finalConsensus: reached ? verdict?.summary || null : null,
    });

    if (reached) {
      finalConsensus = verdict?.summary || null;
      status = 'REACHED_CONSENSUS';
      break;
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
