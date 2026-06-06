const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function listBenchmarks(page = 1, limit = 20): Promise<any> {
  const res = await fetch(`${API_BASE}/benchmarks?page=${page}&limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to list benchmarks');
  return res.json();
}

export async function getBenchmark(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/benchmarks/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to get benchmark');
  return res.json();
}

export async function createBenchmark(data: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API_BASE}/benchmarks`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create benchmark');
  return res.json();
}

export async function deleteBenchmark(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/benchmarks/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete benchmark');
}

// SSE progress listener
export function onBenchmarkProgress(
  runId: string,
  onEvent: (event: any) => void
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // Use EventSource-like approach via fetch for SSE
  fetch(`${API_BASE}/benchmarks/${runId}/stream`, { headers })
    .then(async response => {
      if (!response.ok) return;
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || controller.signal.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(trimmed.slice(6));
              onEvent(data);
            } catch { /* skip */ }
          }
        }
      } catch { /* stream ended */ }
    })
    .catch(() => {});

  return controller;
}
