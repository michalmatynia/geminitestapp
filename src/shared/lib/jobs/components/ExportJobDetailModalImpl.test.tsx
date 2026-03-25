import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportJobDetailModal } from '@/shared/lib/jobs/components/ExportJobDetailModalImpl';

const statusBadgeMock = vi.hoisted(() => vi.fn());
const detailModalMock = vi.hoisted(() => vi.fn());
const detailModalSectionMock = vi.hoisted(() => vi.fn());
const formatDateTimeMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui', () => ({
  StatusBadge: statusBadgeMock,
}));
vi.mock('@/shared/ui/templates/modals', () => ({
  DetailModal: detailModalMock,
  DetailModalSection: detailModalSectionMock,
}));
vi.mock('@/shared/utils', () => ({
  formatDateTime: formatDateTimeMock,
}));

describe('ExportJobDetailModal', () => {
  beforeEach(() => {
    statusBadgeMock.mockReset();
    detailModalMock.mockReset();
    detailModalSectionMock.mockReset();
    formatDateTimeMock.mockReset();

    statusBadgeMock.mockImplementation(({ status }: { status: string }) => (
      <div data-testid='status-badge'>{status}</div>
    ));
    detailModalMock.mockImplementation(
      ({
        children,
        isOpen,
        size,
        title,
      }: {
        children: React.ReactNode;
        isOpen: boolean;
        size: string;
        title: string;
      }) => (
        <div
          data-testid='detail-modal'
          data-is-open={isOpen ? 'true' : 'false'}
          data-size={size}
          data-title={title}
        >
          {children}
        </div>
      )
    );
    detailModalSectionMock.mockImplementation(
      ({
        children,
        title,
      }: {
        children: React.ReactNode;
        title: string;
      }) => (
        <section data-testid={`section-${title}`}>
          <h2>{title}</h2>
          {children}
        </section>
      )
    );
    formatDateTimeMock.mockImplementation((value: unknown) => `formatted:${String(value)}`);
  });

  it('renders nothing when the modal is closed or has no item', () => {
    const { container, rerender } = render(
      <ExportJobDetailModal isOpen={false} onClose={vi.fn()} item={null} />
    );

    expect(container).toBeEmptyDOMElement();

    rerender(<ExportJobDetailModal isOpen onClose={vi.fn()} item={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders listing details and empty history copy', () => {
    render(
      <ExportJobDetailModal
        isOpen
        onClose={vi.fn()}
        item={{
          job: { id: 'job-1' } as never,
          listing: {
            externalListingId: 'ext-1',
            status: 'listed',
            integrationName: 'Allegro',
            updatedAt: '2026-03-25T12:00:00.000Z',
            exportHistory: [],
          } as never,
        }}
      />
    );

    expect(screen.getByTestId('detail-modal')).toHaveAttribute('data-size', 'lg');
    expect(screen.getByTestId('detail-modal')).toHaveAttribute('data-title', 'Export Job Details');
    expect(screen.getByText('ext-1')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveTextContent('listed');
    expect(screen.getByText('Allegro')).toBeInTheDocument();
    expect(screen.getByText('formatted:2026-03-25T12:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('No history available.')).toBeInTheDocument();
  });

  it('renders fallback values and sync history entries', () => {
    render(
      <ExportJobDetailModal
        isOpen
        onClose={vi.fn()}
        item={{
          job: { id: 'job-2' } as never,
          listing: {
            externalListingId: null,
            status: null,
            integrationName: null,
            updatedAt: '2026-03-25T13:00:00.000Z',
            exportHistory: [
              {
                status: 'success',
                exportedAt: '2026-03-25T13:00:00.000Z',
              },
              {
                status: '',
                failureReason: 'network timeout',
                exportedAt: '2026-03-25T13:05:00.000Z',
              },
            ],
          } as never,
        }}
      />
    );

    expect(screen.getAllByText('n/a')).toHaveLength(3);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('n/a');
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('network timeout')).toBeInTheDocument();
    expect(screen.getAllByText('formatted:2026-03-25T13:00:00.000Z')).toHaveLength(2);
    expect(screen.getByText('formatted:2026-03-25T13:05:00.000Z')).toBeInTheDocument();
  });
});
