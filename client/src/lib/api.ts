import axios from 'axios';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';
export const FILE_BASE = process.env.NEXT_PUBLIC_FILE_BASE || 'http://localhost:5003';

const ACCESS_KEY = 'shreeji_admin_access';
const REFRESH_KEY = 'shreeji_admin_refresh';
const USER_KEY = 'shreeji_admin_user';

export const tokenStore = {
  get access() {
    return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;
  },
  get refresh() {
    return typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
  },
  get user() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set(access: string, refresh: string, user?: unknown) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh_token = tokenStore.refresh;
  if (!refresh_token) return null;
  try {
    const { data } = await axios.post(`${API_BASE}/auth/admin/refresh`, { refresh_token });
    tokenStore.set(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken as string;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing || doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function fileUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || 'Request failed';
  }
  return 'Something went wrong';
}
