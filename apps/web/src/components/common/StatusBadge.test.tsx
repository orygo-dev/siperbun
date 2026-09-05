import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders known producer status label', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('renders known application status label', () => {
    render(<StatusBadge status="DRAFT" kind="application" />);
    expect(screen.getByText(/draft|draf/i)).toBeInTheDocument();
  });

  it('renders actual payment application status', () => {
    render(<StatusBadge status="WAITING_PAYMENT" kind="application" />);
    expect(screen.getByText('Menunggu Pembayaran')).toBeInTheDocument();
  });

  it('renders payment verification application status', () => {
    render(<StatusBadge status="PAYMENT_VERIFICATION" kind="application" />);
    expect(screen.getByText('Verifikasi Pembayaran')).toBeInTheDocument();
  });
});
