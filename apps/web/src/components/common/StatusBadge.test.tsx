import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders known producer status label', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('renders known application status label', () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText(/draft|draf/i)).toBeInTheDocument();
  });
});
