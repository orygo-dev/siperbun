import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';

type Props = {
  permission?: string | string[];
  any?: string[];
  children: ReactNode;
};

export function RequirePermission({ permission, any, children }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const perms = any ?? (Array.isArray(permission) ? permission : [permission ?? '']);
  const ok = any
    ? hasAnyPermission(...perms)
    : hasPermission(...perms);

  if (!ok) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-sm text-[var(--text-secondary)]">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    );
  }

  return <>{children}</>;
}
