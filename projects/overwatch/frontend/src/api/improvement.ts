import { getAuthToken } from '../utils/auth';

const API_BASE = '/api';

function headers(): Record<string, string> {
  const t = getAuthToken();
  return t
    ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export type ChangeStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'DEPLOYED' | 'REJECTED' | 'ROLLED_BACK';
export type ChangeCategory = 'CONFIG_TWEAK' | 'UI_IMPROVEMENT' | 'AGENT_CONFIG' | 'COMPONENT_UPDATE' | 'SECURITY_PATCH';
export type ChangePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ChangeRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ChangeProposal {
  id: string;
  title: string;
  description: string;
  category: ChangeCategory;
  type: 'AUTO_GENERATED' | 'USER_SUBMITTED' | 'SYSTEM_DETECTED';
  source: string | null;
  proposedByUserId: string | null;
  proposedBySystem: boolean;
  priority: ChangePriority;
  risk: ChangeRisk;
  status: ChangeStatus;
  configDiff: Record<string, unknown>;
  testResults: Record<string, unknown> | null;
  deployedAt: string | null;
  deployedByUserId: string | null;
  rolledBackAt: string | null;
  rollbackReason: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: Array<{
    id: string;
    comment: string;
    createdAt: string;
    user?: { id: string; displayName: string; email: string };
  }>;
}

export interface AnalysisReport {
  providerIssues: number;
  benchmarkIssues: number;
  configIssues: number;
  recommendationsCreated: number;
  recommendationsSkipped: number;
  recommendations: Array<{
    title: string;
    description: string;
    category: ChangeCategory;
    priority: ChangePriority;
    risk: ChangeRisk;
    configDiff: Record<string, unknown>;
    signature: string;
  }>;
}

export interface HealthOverview {
  providers: {
    total: number;
    online: number;
    items: Array<{ id: string; name: string; status: string; latencyMs: number | null; lastChecked: string | null }>;
  };
  openProposals: number;
  benchmarksLast7d: number;
  generatedAt: string;
}

export async function runAnalysis(): Promise<AnalysisReport> {
  const r = await fetch(`${API_BASE}/improvement/analyze`, { method: 'POST', headers: headers() });
  if (!r.ok) throw new Error((await r.json()).error?.toString() ?? 'Failed to run analysis');
  return r.json();
}

export async function getHealth(): Promise<HealthOverview> {
  const r = await fetch(`${API_BASE}/improvement/health`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to load health');
  return r.json();
}

export async function listProposals(params: { status?: ChangeStatus; category?: ChangeCategory; priority?: ChangePriority } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.category) q.set('category', params.category);
  if (params.priority) q.set('priority', params.priority);
  const r = await fetch(`${API_BASE}/change-proposals?${q.toString()}`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list proposals');
  return r.json() as Promise<{ proposals: ChangeProposal[] }>;
}

export async function getProposal(id: string) {
  const r = await fetch(`${API_BASE}/change-proposals/${id}`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to load proposal');
  return r.json() as Promise<{ proposal: ChangeProposal }>;
}

export async function approveProposal(id: string) {
  const r = await fetch(`${API_BASE}/change-proposals/${id}/approve`, { method: 'POST', headers: headers() });
  if (!r.ok) throw new Error((await r.json()).error?.toString() ?? 'Failed to approve');
  return r.json() as Promise<{ proposal: ChangeProposal }>;
}

export async function rejectProposal(id: string, reason?: string) {
  const r = await fetch(`${API_BASE}/change-proposals/${id}/reject`, { method: 'POST', headers: headers(), body: JSON.stringify({ reason }) });
  if (!r.ok) throw new Error((await r.json()).error?.toString() ?? 'Failed to reject');
  return r.json() as Promise<{ proposal: ChangeProposal }>;
}

export async function commentProposal(id: string, content: string) {
  const r = await fetch(`${API_BASE}/change-proposals/${id}/comment`, { method: 'POST', headers: headers(), body: JSON.stringify({ content }) });
  if (!r.ok) throw new Error('Failed to add comment');
  return r.json();
}
