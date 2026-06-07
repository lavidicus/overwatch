import { getAuthToken } from '../utils/auth';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export type AgentRole = 'facilitator' | 'analyst' | 'critic' | 'advisor';

export interface AgentParticipant {
  id: string;
  agentName: string;
  role: AgentRole;
  systemPrompt: string | null;
  providerId: string;
  providerName: string | null;
  modelId: string | null;
  modelName: string | null;
  position: number;
  isActive: boolean;
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  maxRounds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  agents: { agentName: string; role: AgentRole }[];
  agentCount: number;
  roundCount: number;
}

export interface ChatGroupDetail {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isActive: boolean;
  maxRounds: number;
  judgeProviderId: string | null;
  judgeModelId: string | null;
  allowToolCalls: boolean;
  requireToolApproval: boolean;
  allowedToolIds: string[] | null;
  createdAt: string;
  updatedAt: string;
  agents: AgentParticipant[];
  lastRound: {
    id: string;
    roundNumber: number;
    topic: string;
    status: string;
    finalConsensus: string | null;
    createdAt: string;
    endedAt: string | null;
  } | null;
  roundCount: number;
}

export interface AvailableAgent {
  modelId: string;
  modelName: string;
  displayName: string | null;
  providerId: string;
  providerName: string;
  providerType: string;
  providerStatus: string;
}

export interface ConsensusToolCallRef {
  name: string;
  ok: boolean;
  status: 'EXECUTED' | 'AUTO_REJECTED' | 'REJECTED' | 'TIMEOUT' | 'UNKNOWN_TOOL';
  invocationId?: string;
}

export interface ConsensusTurn {
  agentName: string;
  role: string;
  message: string;
  durationMs: number;
  error?: string | null;
  toolCalls?: ConsensusToolCallRef[];
}

export interface RoundTranscript {
  roundId: string;
  roundNumber: number;
  turns: ConsensusTurn[];
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

export interface GroupAgentInput {
  agentName: string;
  providerId: string;
  modelId?: string;
  role: AgentRole;
  systemPrompt?: string;
  position?: number;
  isActive?: boolean;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  maxRounds?: number;
  judgeProviderId?: string;
  judgeModelId?: string;
  allowToolCalls?: boolean;
  requireToolApproval?: boolean;
  allowedToolIds?: string[] | null;
  agents: GroupAgentInput[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(
      typeof body.error === 'string' ? body.error : `HTTP ${res.status}`,
    );
  }
  return res.json();
}

export async function listGroups(): Promise<{ groups: GroupSummary[] }> {
  const res = await fetch(`${API_BASE}/chat/groups`, { headers: getAuthHeaders() });
  return handle(res);
}

export async function getGroup(id: string): Promise<{ group: ChatGroupDetail }> {
  const res = await fetch(`${API_BASE}/chat/groups/${id}`, { headers: getAuthHeaders() });
  return handle(res);
}

export async function createGroup(
  body: CreateGroupInput,
): Promise<{ group: ChatGroupDetail }> {
  const res = await fetch(`${API_BASE}/chat/groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateGroup(
  id: string,
  body: Partial<CreateGroupInput> & { isActive?: boolean },
): Promise<{ group: ChatGroupDetail }> {
  const res = await fetch(`${API_BASE}/chat/groups/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/groups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await handle(res);
}

export async function runConsensus(
  groupId: string,
  topic: string,
  sessionId?: string,
  maxRounds?: number,
): Promise<ConsensusResult> {
  const res = await fetch(`${API_BASE}/chat/groups/${groupId}/consensus`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ topic, sessionId, maxRounds }),
  });
  return handle(res);
}

export async function getGroupHistory(groupId: string): Promise<{
  groupId: string;
  rounds: {
    id: string;
    roundNumber: number;
    topic: string;
    status: string;
    finalConsensus: string | null;
    judgeAnalysis: string | null;
    createdAt: string;
    endedAt: string | null;
    messages: {
      id: string;
      agentName: string;
      role: string;
      message: string;
      position: number;
      createdAt: string;
    }[];
  }[];
}> {
  const res = await fetch(`${API_BASE}/chat/groups/${groupId}/history`, {
    headers: getAuthHeaders(),
  });
  return handle(res);
}

export async function listAvailableAgents(): Promise<{ models: AvailableAgent[] }> {
  const res = await fetch(`${API_BASE}/chat/groups/agents/available`, {
    headers: getAuthHeaders(),
  });
  return handle(res);
}
