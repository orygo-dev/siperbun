import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const setSession = vi.fn();

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (s: {
    accessToken: string | null;
    setSession: typeof setSession;
  }) => unknown) =>
    selector({
      accessToken: null,
      setSession,
    }),
}));

vi.mock('../stores/brandingStore', () => ({
  useBrandingStore: (selector: (s: {
    branding: {
      appName: string;
      fullName: string;
      officeName: string;
      logoFileId: null;
      logoUrl: null;
    };
    logoSrc: () => null;
  }) => unknown) =>
    selector({
      branding: {
        appName: 'SIPERBUN',
        fullName: 'Sistem Informasi Perbenihan Perkebunan',
        officeName: 'Dinas Perkebunan Provinsi Kalimantan Selatan',
        logoFileId: null,
        logoUrl: null,
      },
      logoSrc: () => null,
    }),
}));

vi.mock('../services/auth', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    setSession.mockReset();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const email = screen.getByLabelText(/^email$/i);
    const password = screen.getByLabelText(/^password$/i);

    await user.clear(email);
    await user.clear(password);
    await user.click(screen.getByRole('button', { name: /^masuk$/i }));

    await waitFor(() => {
      expect(screen.getByText(/email tidak valid/i)).toBeInTheDocument();
      expect(
        screen.getByText(/password minimal 6 karakter/i),
      ).toBeInTheDocument();
    });
  });

  it('shows password too short error', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const email = screen.getByLabelText(/^email$/i);
    const password = screen.getByLabelText(/^password$/i);

    await user.clear(email);
    await user.type(email, 'admin@siperbun.local');
    await user.clear(password);
    await user.type(password, '123');
    await user.click(screen.getByRole('button', { name: /^masuk$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password minimal 6 karakter/i),
      ).toBeInTheDocument();
    });
  });
});
