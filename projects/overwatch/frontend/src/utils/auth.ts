import { useAuthStore } from '../stores/authStore';

/**
 * Get the current auth token from Zustand store.
 * Works both inside and outside React components.
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

/**
 * Build auth headers for fetch/API calls.
 */
export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
