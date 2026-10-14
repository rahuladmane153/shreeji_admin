'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenStore } from './api';

type AdminUser = { id: number; name: string; email: string; role: string };

type AuthCtx = {
  user: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(tokenStore.user);
    setReady(true);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/admin/login', { email, password });
    tokenStore.set(data.data.accessToken, data.data.refreshToken, data.data.user);
    setUser(data.data.user);
    router.push('/dashboard');
  }

  function logout() {
    const refresh_token = tokenStore.refresh;
    if (refresh_token) api.post('/auth/admin/logout', { refresh_token }).catch(() => {});
    tokenStore.clear();
    setUser(null);
    router.push('/login');
  }

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
