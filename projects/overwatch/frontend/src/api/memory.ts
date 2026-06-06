import { getAuthToken } from '../utils/auth';

const API_BASE = '/api';

function headers(): Record<string, string> {
  const t = getAuthToken();
  return t
    ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export type MemoryCategory =
  | 'USER_PROFILE'
  | 'CONVERSATION_HIGHLIGHTS'
  | 'LONG_TERM'
  | 'SESSION_CONTEXT'
  | 'TASK_STATE'
  | 'AGENT_BEHAVIOR'
  | 'SYSTEM_CONFIG';

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'USER_PROFILE',
  'CONVERSATION_HIGHLIGHTS',
  'LONG_TERM',
  'SESSION_CONTEXT',
  'TASK_STATE',
  'AGENT_BEHAVIOR',
  'SYSTEM_CONFIG',
];

export interface Memory {
  id: string;
  userId: string;
  category: MemoryCategory;
  content: string;
  metadata: Record<string, unknown> | null;
  relevanceScore: number;
  isPromoted: boolean;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
  accessedAt: string | null;
  accessCount: number;
  ttlDays: number | null;
}

export interface SearchHit {
  memory: Memory;
  score: number;
  semanticScore?: number;
  ftsScore?: number;
}

export async function listMemories(params: { category?: MemoryCategory; q?: string; page?: number; pageSize?: number } = {}) {
  const q = new URLSearchParams();
  if (params.category) q.set('category', params.category);
  if (params.q) q.set('q', params.q);
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  const r = await fetch(`${API_BASE}/memory?${q.toString()}`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list memories');
  return r.json() as Promise<{ items: Memory[]; total: number; page: number; pageSize: number }>;
}

export async function listCategories() {
  const r = await fetch(`${API_BASE}/memory/categories`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to list categories');
  return r.json() as Promise<{ categories: Array<{ category: MemoryCategory; count: number }> }>;
}

export async function createMemory(body: { category: MemoryCategory; content: string; metadata?: Record<string, unknown> | null; isPromoted?: boolean; ttlDays?: number | null }) {
  const r = await fetch(`${API_BASE}/memory`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json()).error?.toString() ?? 'Failed to create memory');
  return r.json() as Promise<{ memory: Memory }>;
}

export async function updateMemory(id: string, body: Partial<{ category: MemoryCategory; content: string; metadata: Record<string, unknown> | null; isPromoted: boolean; isEditable: boolean; ttlDays: number | null }>) {
  const r = await fetch(`${API_BASE}/memory/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json()).error?.toString() ?? 'Failed to update memory');
  return r.json() as Promise<{ memory: Memory }>;
}

export async function deleteMemory(id: string) {
  const r = await fetch(`${API_BASE}/memory/${id}`, { method: 'DELETE', headers: headers() });
  if (!r.ok) throw new Error('Failed to delete memory');
  return r.json();
}

export async function promoteMemory(id: string, promoted: boolean) {
  const r = await fetch(`${API_BASE}/memory/${id}/promote`, { method: 'POST', headers: headers(), body: JSON.stringify({ promoted }) });
  if (!r.ok) throw new Error('Failed to promote memory');
  return r.json() as Promise<{ memory: Memory }>;
}

export async function searchMemories(body: { query: string; topK?: number; category?: MemoryCategory }) {
  const r = await fetch(`${API_BASE}/memory/search`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error('Failed to search memories');
  return r.json() as Promise<{ hits: SearchHit[] }>;
}

export async function rebuildMemoryIndex() {
  const r = await fetch(`${API_BASE}/memory/rebuild`, { method: 'POST', headers: headers() });
  if (!r.ok) throw new Error('Failed to rebuild memory index');
  return r.json() as Promise<{ rebuilt: number }>;
}

export async function importMemories(items: Array<{ category: MemoryCategory; content: string; metadata?: Record<string, unknown> | null; isPromoted?: boolean }>) {
  const r = await fetch(`${API_BASE}/memory/import`, { method: 'POST', headers: headers(), body: JSON.stringify({ items }) });
  if (!r.ok) throw new Error('Failed to import memories');
  return r.json() as Promise<{ created: number }>;
}
