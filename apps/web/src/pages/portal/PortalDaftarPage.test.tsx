import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PortalDaftarPage } from './PortalDaftarPage';

vi.mock('../../services/public', () => ({
  publicApi: {
    register: vi.fn(),
    kabupaten: vi.fn().mockResolvedValue({
      data: { data: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Kabupaten Banjar', code: 'BANJAR' }] },
    }),
  },
  catalogApi: { createRegistration: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderPage(adminMode = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PortalDaftarPage adminMode={adminMode} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PortalDaftarPage', () => {
  it('renders every required producer registration field', () => {
    renderPage();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nama penangkar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nama perusahaan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nomor hp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^alamat kantor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^kabupaten kantor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^alamat lokasi pembibitan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^kabupaten lokasi pembibitan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status kepemilikan lahan/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pilih file/i)).toHaveLength(9);
  });

  it('blocks submission when text fields and files are incomplete', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /kirim pendaftaran/i }));

    await waitFor(() => {
      expect(screen.getByText(/email tidak valid/i)).toBeInTheDocument();
      expect(screen.getByText(/password minimal 8 karakter/i)).toBeInTheDocument();
      expect(screen.getByText(/nama penangkar minimal 2 karakter/i)).toBeInTheDocument();
    });
  });

  it('uses the same complete form for Super Admin producer creation', () => {
    renderPage(true);
    expect(screen.getByRole('heading', { name: /tambah penangkar baru/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^kabupaten kantor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^kabupaten lokasi pembibitan/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pilih file/i)).toHaveLength(9);
    expect(screen.getByRole('button', { name: /simpan penangkar dan akun/i })).toBeInTheDocument();
  });
});
