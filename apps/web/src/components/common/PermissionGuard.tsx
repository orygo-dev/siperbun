import type { ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';

type Props = {
  permission: string | string[];
  /** default 'all' (AND). Use 'any' for OR matching. */
  mode?: 'all' | 'any';
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGuard({
  permission,
  mode = 'all',
  children,
  fallback = null,
}: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const perms = Array.isArray(permission) ? permission : [permission];
  const ok =
    mode === 'any' ? hasAnyPermission(...perms) : hasPermission(...perms);
  if (!ok) return <>{fallback}</>;
  return <>{children}</>;
}
