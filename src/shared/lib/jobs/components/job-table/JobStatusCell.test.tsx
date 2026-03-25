import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const badgeMock = vi.hoisted(() => vi.fn());
const resolveStatusBadgeVariantMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui', () => ({
  Badge: badgeMock,
  resolveStatusBadgeVariant: resolveStatusBadgeVariantMock,
}));

import { JobStatusCell, getStatusIcon } from '@/shared/lib/jobs/components/job-table/JobStatusCell';

describe('JobStatusCell', () => {
  beforeEach(() => {
    badgeMock.mockReset();
    resolveStatusBadgeVariantMock.mockReset().mockReturnValue('warning');
    badgeMock.mockImplementation(
      ({
        children,
        icon,
        variant,
      }: {
        children: React.ReactNode;
        icon: React.ReactElement;
        variant: string;
      }) => (
        <div data-icon-type={String(icon.type)} data-testid='status-badge' data-variant={variant}>
          {children}
        </div>
      )
    );
  });

  it('returns the expected icons for grouped statuses', () => {
    expect(getStatusIcon('pending').type).toBe(Clock);
    expect(getStatusIcon('listed').type).toBe(CheckCircle);
    expect(getStatusIcon('failed').type).toBe(XCircle);
    expect(getStatusIcon('cancelled').type).toBe(XCircle);
    expect(getStatusIcon('running').type).toBe(Loader2);
    expect(getStatusIcon('unknown').type).toBe(Clock);
  });

  it('renders badge content and optional error text', () => {
    render(<JobStatusCell status=' listed ' errorMessage='network timeout' />);

    expect(resolveStatusBadgeVariantMock).toHaveBeenCalledWith(' listed ');
    expect(screen.getByTestId('status-badge')).toHaveAttribute('data-variant', 'warning');
    expect(screen.getByTestId('status-badge')).toHaveTextContent('listed');
    expect(screen.getByText('network timeout')).toHaveAttribute('title', 'network timeout');
  });

  it('omits the error message when none is provided', () => {
    render(<JobStatusCell status='queued' errorMessage={null} />);

    expect(screen.queryByText('network timeout')).not.toBeInTheDocument();
  });
});
