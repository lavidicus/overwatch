import { getAuthToken } from '../utils/auth';

const API_BASE = '/api';

function headers(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export interface RoutingRule {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  condition: Record<string, unknown> | null;
  targetProviderId: string | null;
  targetModelId: string | null;
  routerMode: string | null;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationResult {
  decision: {
    ruleId: string;
    ruleName: string;
    providerId: string | null;
    modelId: string | null;
    reason: string;
  } | null;
  trace: Array<{
    ruleId: string;
    ruleName: string;
    providerId: string | null;
    modelId: string | null;
    reason: string;
    matched: boolean;
  }>;
}

export async function listRules(): Promise<{ rules: RoutingRule[] }> {
  const r = await fetch(`${API_BASE}/routing/rules`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list rules');
  return r.json();
}

export async function createRule(rule: Partial<RoutingRule>): Promise<{ rule: RoutingRule }> {
  const r = await fetch(`${API_BASE}/routing/rules`, { method: 'POST', headers: headers(), body: JSON.stringify(rule) });
  if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to create rule');
  return r.json();
}

export async function updateRule(id: string, patch: Partial<RoutingRule>): Promise<{ rule: RoutingRule }> {
  const r = await fetch(`${API_BASE}/routing/rules/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) });
  if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to update rule');
  return r.json();
}

export async function deleteRule(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/routing/rules/${id}`, { method: 'DELETE', headers: headers() });
  if (!r.ok) throw new Error('Failed to delete rule');
}

export async function simulate(prompt: string): Promise<SimulationResult> {
  const r = await fetch(`${API_BASE}/routing/simulate`, { method: 'POST', headers: headers(), body: JSON.stringify({ prompt }) });
  if (!r.ok) throw new Error('Failed to simulate');
  return r.json();
}
