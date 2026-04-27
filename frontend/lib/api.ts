import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Analytics, Application, ApplicationDraft, Detection, User } from '../types';

const expoExtra = (Constants.expoConfig?.extra || {}) as Record<string, string>;
const API_BASE = (expoExtra.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'jobtrackr_token';

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.detail || data.message || 'Request failed');
  return data as T;
}

export const authApi = {
  register: (payload: { email: string; password: string; name: string }) => api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) => api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  googleSession: (session_id: string) => api<{ token: string; user: User }>('/auth/google/session', { method: 'POST', body: JSON.stringify({ session_id }) }),
  me: () => api<User>('/auth/me'),
  logout: () => api('/auth/logout', { method: 'POST' }),
};

export const appApi = {
  list: () => api<Application[]>('/applications'),
  create: (payload: ApplicationDraft) => api<Application>('/applications', { method: 'POST', body: JSON.stringify(payload) }),
  updateStatus: (id: string, status: string) => api<Application>(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  analytics: () => api<Analytics>('/analytics'),
  parseDetection: (source: string, text: string, image_base64?: string) => api<Detection>('/detections/parse', { method: 'POST', body: JSON.stringify({ source, text, image_base64 }) }),
  acceptDetection: (id: string) => api<Application>(`/detections/${id}/accept`, { method: 'POST' }),
  ignoreDetection: (id: string) => api(`/detections/${id}/ignore`, { method: 'POST' }),
  gmailConfig: () => api<{ configured: boolean; connected: boolean; redirect_uri: string; message: string }>('/gmail/config'),
  gmailConnect: () => api<{ auth_url: string; redirect_uri: string }>('/gmail/connect'),
  gmailSync: () => api<Detection[]>('/gmail/sync', { method: 'POST' }),
};

export { API_BASE };