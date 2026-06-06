import { getAuthToken } from '../utils/auth';

const API_BASE = '/api';

function headers(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: Record<string, unknown>;
  enabled: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToolInvocation {
  id: string;
  sessionId: string | null;
  toolId: string;
  userId: string;
  args: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'RUNNING' | 'DONE' | 'FAILED' | 'REJECTED';
  result: unknown;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
  approvedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  tool?: { name: string; category: string };
}

export async function listTools(): Promise<{ tools: Tool[] }> {
  const r = await fetch(`${API_BASE}/tools`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list tools');
  return r.json();
}

export async function patchTool(id: string, patch: Partial<Tool>): Promise<{ tool: Tool }> {
  const r = await fetch(`${API_BASE}/tools/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) });
  if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to update tool');
  return r.json();
}

export async function listInvocations(sessionId?: string): Promise<{ invocations: ToolInvocation[] }> {
  const url = sessionId ? `${API_BASE}/tools/invocations/all?sessionId=${sessionId}` : `${API_BASE}/tools/invocations/all`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list invocations');
  return r.json();
}

export async function approveInvocation(id: string): Promise<{ invocation: ToolInvocation }> {
  const r = await fetch(`${API_BASE}/tools/invocations/${id}/approve`, { method: 'POST', headers: headers() });
  if (!r.ok) throw new Error('Failed to approve invocation');
  return r.json();
}

export async function rejectInvocation(id: string): Promise<{ invocation: ToolInvocation }> {
  const r = await fetch(`${API_BASE}/tools/invocations/${id}/reject`, { method: 'POST', headers: headers() });
  if (!r.ok) throw new Error('Failed to reject invocation');
  return r.json();
}

export async function executeInvocation(id: string): Promise<{ invocation: ToolInvocation; result: unknown }> {
  const r = await fetch(`${API_BASE}/tools/invocations/${id}/execute`, { method: 'POST', headers: headers() });
  if (!r.ok) throw new Error('Failed to execute invocation');
  return r.json();
}
