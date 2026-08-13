import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/auth';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const [checking, setChecking] = useState(!accessToken);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (accessToken) {
        setChecking(false);
        return;
      }
      try {
        const res = await authApi.refresh();
        if (!cancelled) {
          setSession(res.data.data.accessToken, res.data.data.user);
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [accessToken, setSession, logout]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-[var(--text-secondary)]">
        Memuat sesi...
      </div>
    );
  }

  if (!useAuthStore.getState().accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
