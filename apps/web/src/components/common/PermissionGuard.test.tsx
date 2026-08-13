import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionGuard } from './PermissionGuard';

const hasPermission = vi.fn();
const hasAnyPermission = vi.fn();

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (s: {
    hasPermission: (...p: string[]) => boolean;
    hasAnyPermission: (...p: string[]) => boolean;
  }) => unknown) =>
    selector({
      hasPermission,
      hasAnyPermission,
    }),
}));

describe('PermissionGuard', () => {
  beforeEach(() => {
    hasPermission.mockReset();
    hasAnyPermission.mockReset();
  });

  it('hides children without permission', () => {
    hasPermission.mockReturnValue(false);
    render(
      <PermissionGuard permission="user.manage">
        <button type="button">Kelola User</button>
      </PermissionGuard>,
    );
    expect(screen.queryByText('Kelola User')).not.toBeInTheDocument();
  });

  it('shows children when permission granted', () => {
    hasPermission.mockReturnValue(true);
    render(
      <PermissionGuard permission="dashboard.view">
        <button type="button">Dashboard</button>
      </PermissionGuard>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows children for SUPER_ADMIN via hasPermission true', () => {
    // authStore.hasPermission returns true for SUPER_ADMIN roles
    hasPermission.mockReturnValue(true);
    render(
      <PermissionGuard permission="audit.view">
        <span>Audit</span>
      </PermissionGuard>,
    );
    expect(screen.getByText('Audit')).toBeInTheDocument();
  });
});
