import { create } from 'zustand';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  producerId?: string | null;
  roles: string[];
  permissions: string[];
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  hasPermission: (...perms: string[]) => boolean;
  hasAnyPermission: (...perms: string[]) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setSession: (accessToken, user) => set({ accessToken, user, hydrated: true }),
  logout: () => set({ accessToken: null, user: null, hydrated: true }),
  hasPermission: (...perms) => {
    const user = get().user;
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN')) return true;
    return perms.every((p) => user.permissions.includes(p));
  },
  hasAnyPermission: (...perms) => {
    const user = get().user;
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN')) return true;
    if (perms.length === 0) return true;
    return perms.some((p) => user.permissions.includes(p));
  },
}));
