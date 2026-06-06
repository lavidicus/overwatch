import { getAuthToken } from '../utils/auth';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export interface ChatSession {
  id: string;
  title: string | null;
  providerId: string | null;
  providerName?: string;
  model: string | null;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  isAgentChat?: boolean;
  allowedToolIds?: string[] | null;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  error?: string | null;
}

export interface AgentPendingCall {
  invocationId: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AgentResult {
  iterations: number;
  /** True when the loop stopped because a tool needs human approval. */
  pending: boolean;
  invocationIds?: string[];
  /** Tool calls awaiting approval. */
  pendingCalls?: AgentPendingCall[];
  toolCalls: AgentToolCall[];
}

export interface AgentMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  agent: AgentResult;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  modelUsed: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

// Session CRUD
export async function listSessions(page = 1, limit = 50): Promise<{ sessions: ChatSession[]; pagination: any }> {
  const res = await fetch(`${API_BASE}/chat/sessions?page=${page}&limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to list sessions');
  return res.json();
}

export async function createSession(data: { title?: string; providerId?: string; model?: string; systemPrompt?: string; temperature?: number; maxTokens?: number; isAgentChat?: boolean; allowedToolIds?: string[] }): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/sessions`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function getSession(id: string, limit = 100): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/sessions/${id}?limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to get session');
  return res.json();
}

export async function updateSession(id: string, data: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/sessions/${id}`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/sessions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete session');
}

// Messages
export async function getMessages(sessionId: string, page = 1, limit = 100): Promise<{ messages: ChatMessage[]; pagination: any }> {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages?page=${page}&limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to get messages');
  return res.json();
}

// Send message with SSE streaming
export function sendMessageStreaming(
  sessionId: string,
  content: string,
  onChunk: (text: string) => void,
  onComplete: (fullContent: string) => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, stream: true }),
    signal: controller.signal,
  })
    .then(async response => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
        onError(err.error?.message || `HTTP ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { onError('No response body'); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') { onComplete(fullContent); return; }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                onChunk(delta);
              }
              if (parsed.error) onError(parsed.error.message);
            } catch { /* skip */ }
          }
        }
      } catch (err: unknown) {
        onError(err instanceof Error ? err.message : 'Stream error');
      }
    })
    .catch(err => {
      if (err.name !== 'AbortError') onError(err.message);
    });

  return controller;
}

// Non-streaming send
export async function sendMessage(sessionId: string, content: string): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, stream: false }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

// Agent-mode send: runs the backend tool-calling agent loop and returns the
// assistant message plus any tool calls that were made (or are pending
// approval). Non-streaming — the agent loop is multi-turn, so callers
// typically show a “thinking…” indicator while this promise resolves.
export async function sendAgentMessage(
  sessionId: string,
  content: string,
  opts?: { maxIterations?: number },
): Promise<AgentMessageResponse> {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/agent-message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, ...(opts?.maxIterations ? { maxIterations: opts.maxIterations } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
  }
  return res.json();
}
