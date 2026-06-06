import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

// Create axios instance with defaults
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Attach CSRF token if available
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrfToken='))
      ?.split('=')[1];
    
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth state
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string, mfaCode?: string) =>
    api.post('/auth/login', { email, password, mfaCode }),
  
  register: (email: string, password: string, displayName: string, department?: string) =>
    api.post('/auth/register', { email, password, displayName, department }),
  
  logout: () => api.post('/auth/logout'),
  
  getMe: () => api.get('/auth/me'),
  
  setupMFA: (enable: boolean, mfaCode?: string) =>
    api.post('/auth/mfa/setup', { enable, mfaCode }),
  
  getMFAQR: () => api.get('/auth/mfa/qr'),
};

// Settings API
export const settingsApi = {
  list: () => api.get('/settings'),
  get: (key: string) => api.get(`/settings/${key}`),
  save: (key: string, value: string, category?: string) =>
    api.post('/settings', { key, value, category }),
  delete: (key: string) => api.delete(`/settings/${key}`),
  
  // Encryption keys
  listEncryptionKeys: () => api.get('/settings/encryption/keys'),
  registerEncryptionKey: (data: { source: string; importedCert?: string; expiresAt?: string }) =>
    api.post('/settings/encryption/keys', data),
  revokeKey: (version: number) =>
    api.post(`/settings/encryption/keys/${version}/revoke`),
  setPrimaryKey: (version: number) =>
    api.post(`/settings/encryption/keys/${version}/primary`),
};

// Audit API
export const auditApi = {
  list: (params?: {
    action?: string;
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/audit/logs', { params }),
  
  get: (id: string) => api.get(`/audit/logs/${id}`),
  
  stats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/audit/stats', { params }),
};

// CSRF API
export const csrfApi = {
  getToken: () => api.get('/csrf/token'),
};

// Providers API
export const providersApi = {
  list: () => api.get('/providers'),
  get: (id: string) => api.get(`/providers/${id}`),
  create: (data: any) => api.post('/providers', data),
  update: (id: string, data: any) => api.put(`/providers/${id}`, data),
  delete: (id: string) => api.delete(`/providers/${id}`),
  connect: (id: string, data?: { apiKey?: string; testConnection?: boolean }) =>
    api.post(`/providers/${id}/connect`, data),
  disconnect: (id: string) => api.post(`/providers/${id}/disconnect`),
  discoverAll: (id: string) => api.post(`/providers/${id}/discover-all`),
};

// Models API
export const modelsApi = {
  list: (params?: { providerId?: string; status?: string; source?: string }) =>
    api.get('/models', { params }),
  get: (id: string) => api.get(`/models/${id}`),
  create: (data: any) => api.post('/models', data),
  update: (id: string, data: any) => api.put(`/models/${id}`, data),
  delete: (id: string) => api.delete(`/models/${id}`),
  listByProvider: (providerId: string) => api.get(`/providers/${providerId}/models`),
  discover: (providerId: string) => api.post(`/providers/${providerId}/discover`),
  discoverAll: (providerId: string) => api.post(`/providers/${providerId}/discover-all`),
  inspect: (path: string, systemId?: string) =>
    api.get('/models/inspect', { params: { path, systemId } }),
  scanSystemModels: (systemId: string, path?: string) =>
    api.post(`/systems/${systemId}/models/scan`, { path: path || '/opt/models/gguf' }),
  scanTree: (systemId: string, path: string) =>
    api.post(`/systems/${systemId}/models/scan-tree`, { path }),
};

// Systems API
export const systemsApi = {
  list: () => api.get('/systems'),
  get: (id: string) => api.get(`/systems/${id}`),
  create: (data: any) => api.post('/systems', data),
  update: (id: string, data: any) => api.put(`/systems/${id}`, data),
  delete: (id: string) => api.delete(`/systems/${id}`),
  testConnection: (id: string) => api.post(`/systems/${id}/test-connection`),
  healthCheck: (id: string) => api.post(`/systems/${id}/health-check`),
  runWhatllm: (id: string) => api.post(`/systems/${id}/run-whatllm`),
  getHardware: (id: string) => api.get(`/systems/${id}/hardware`),
};

// WhatLLM API
export const whatllmApi = {
  listSystems: () => api.get('/whatllm/systems'),
  analyze: (systemId: string) => api.post(`/whatllm/analyze/${systemId}`),
  getRecommendations: (systemId: string) => api.get(`/whatllm/recommendations/${systemId}`),
  compare: (systemIds: string[]) => api.post('/whatllm/compare', { systemIds }),
};

// HuggingFace API
export const hfApi = {
  search: (params: { q: string; limit?: number; sort?: string; tags?: string }) =>
    api.get('/hf/search', { params }),
  getModel: (repoId: string) =>
    api.get(`/hf/models/${repoId}`),
  download: (data: { repoId: string; filename: string; systemId: string; targetPath?: string }) =>
    api.post('/hf/download', data),
  listDownloads: (params?: { systemId?: string; status?: string }) =>
    api.get('/hf/downloads', { params }),
  getDownload: (id: string) =>
    api.get(`/hf/downloads/${id}`),
  cancelDownload: (id: string) =>
    api.post(`/hf/downloads/${id}/cancel`),
};

export default api;
