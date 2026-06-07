import { getAuthToken } from '../utils/auth';

const API_BASE = '/api';

function headers(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  port: number | null;
  status: string;
}

export interface AdvisorProfile {
  id: string;
  name: string;
  systemPrompt: string;
  providerId: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: {
    id: string;
    name: string;
    type: string;
  };
}

export async function listAdvisors(): Promise<{ advisors: AdvisorProfile[] }> {
  const r = await fetch(`${API_BASE}/advisors`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list advisors');
  return r.json();
}

export async function getAdvisor(id: string): Promise<{ advisor: AdvisorProfile }> {
  const r = await fetch(`${API_BASE}/advisors/${id}`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to get advisor');
  return r.json();
}

export async function createAdvisor(input: {
  name: string;
  systemPrompt: string;
  providerId?: string | null;
  model?: string | null;
}): Promise<{ advisor: AdvisorProfile }> {
  const r = await fetch(`${API_BASE}/advisors`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to create advisor');
  return r.json();
}

export async function updateAdvisor(
  id: string,
  input: {
    name?: string;
    systemPrompt?: string;
    providerId?: string | null;
    model?: string | null;
  },
): Promise<{ advisor: AdvisorProfile }> {
  const r = await fetch(`${API_BASE}/advisors/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to update advisor');
  return r.json();
}

export async function deleteAdvisor(id: string): Promise<{ ok: boolean }> {
  const r = await fetch(`${API_BASE}/advisors/${id}`, { method: 'DELETE', headers: headers() });
  if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to delete advisor');
  return r.json();
}

export async function listProviders(): Promise<{ providers: Provider[] }> {
  const r = await fetch(`${API_BASE}/providers`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list providers');
  return r.json();
}

export interface GenerateAdvisorResponse {
  generatedPrompt: string;
  usedProvider: string;
  usedModel: string;
}

export async function generateAdvisor(input: {
  instruction: string;
  providerId?: string;
  model?: string;
}): Promise<GenerateAdvisorResponse> {
  const r = await fetch(`${API_BASE}/advisors/generate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to generate advisor profile');
  return r.json();
}
