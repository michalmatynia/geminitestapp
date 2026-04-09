/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useImportExportActionsMock: vi.fn(),
  useImportExportDataMock: vi.fn(),
  handleResumeImportMock: vi.fn(),
  handleCancelImportMock: vi.fn(),
  handleDownloadImportReportMock: vi.fn(),
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
  useImportExportActions: () => mocks.useImportExportActionsMock(),
  useImportExportData: () => mocks.useImportExportDataMock(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    title,
    subtitle,
    children,
    actions,
    ...props
  }: {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    actions?: React.ReactNode;
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>
      {title ? <h2>{title}</h2> : null}
      {subtitle ? <p>{subtitle}</p> : null}
      {actions}
      {children}
    </div>
  ),
  Hint: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ status }: { status: string }) => <div>{status}</div>,
}));

vi.mock('./Import.RunStatus.helpers', () => ({
  buildCustomFieldImportSummaryFromItems: () => null,
  formatCustomFieldImportHistory: () => null,
  getImportRunErrorItems: () => [],
  getCustomFieldImportHistoryItems: () => [],
  getParameterSyncHistoryItems: () => [],
  hasRetryableImportItems: () => false,
  resolveImportRunDispatchDiagnostics: (run: {
    preflight?: { ok: boolean; issues: Array<{ message: string }> } | null;
    dispatchMode?: 'queued' | 'inline' | null;
    stats?: { total?: number } | null;
    status?: string;
  } | null) => {
    if (!run) {
      return null;
    }
    if (run.preflight && !run.preflight.ok) {
      return {
        tone: 'error' as const,
        title: 'Dispatch stopped at preflight',
        details: [
          'This run did not reach the runtime queue because the preflight check failed.',
          ...run.preflight.issues.map((issue) => issue.message),
        ],
      };
    }

    if (run.dispatchMode == null && (run.stats?.total ?? 0) === 0 && run.status === 'completed') {
      return {
        tone: 'warning' as const,
        title: 'No products matched the current import filters',
        details: ['Nothing was queued because item resolution returned zero import candidates.'],
      };
    }

    if (run.dispatchMode === 'inline') {
      return {
        tone: 'warning' as const,
        title: 'This run used inline fallback instead of BullMQ',
        details: [
          'Base imports use the separate base-import runtime queue.',
          'This run executed inline because Redis queueing was unavailable or enqueueing failed.',
        ],
      };
    }

    return null;
  },
  resolveImportRunParameterImportSummary: () => null,
}));

import { ImportRunStatusSection } from './Import.RunStatus';

describe('ImportRunStatusSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useImportExportActionsMock.mockReturnValue({
      importing: false,
      handleResumeImport: mocks.handleResumeImportMock,
      handleCancelImport: mocks.handleCancelImportMock,
      handleDownloadImportReport: mocks.handleDownloadImportReportMock,
    });
  });

  it('renders dispatch mode and queue job details for queued runs', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: {
          id: 'run-1',
          status: 'queued',
          dispatchMode: 'queued',
          queueJobId: 'job-1',
          stats: {
            total: 10,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            pending: 10,
          },
          summaryMessage: 'Queued 10 products for import.',
        },
        items: [],
      },
      loadingImportRun: false,
    });

    render(<ImportRunStatusSection />);

    expect(screen.getByText('Dispatch mode:')).toBeInTheDocument();
    expect(screen.getByText('queued (base-import runtime queue)')).toBeInTheDocument();
    expect(screen.getByText('Queue job:')).toBeInTheDocument();
    expect(screen.getByText('job-1')).toBeInTheDocument();
  });

  it('renders the inline fallback explanation when the run did not use the queue', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: {
          id: 'run-2',
          status: 'running',
          dispatchMode: 'inline',
          queueJobId: 'inline-123',
          stats: {
            total: 1,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            pending: 1,
          },
          summaryMessage: 'Import running inline.',
        },
        items: [],
      },
      loadingImportRun: false,
    });

    render(<ImportRunStatusSection />);

    expect(screen.getByText('inline fallback')).toBeInTheDocument();
    expect(screen.getByText('This run used inline fallback instead of BullMQ')).toBeInTheDocument();
    expect(screen.getByText('Base imports use the separate base-import runtime queue.')).toBeInTheDocument();
  });

  it('renders a preflight-blocked diagnostic when the run never reached dispatch', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: {
          id: 'run-3',
          status: 'failed',
          dispatchMode: null,
          queueJobId: null,
          preflight: {
            ok: false,
            issues: [{ code: 'MISSING_CATALOG', message: 'Catalog is required.', severity: 'error' }],
            checkedAt: '2026-04-09T18:00:00.000Z',
          },
          stats: {
            total: 0,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            pending: 0,
          },
          summaryMessage: 'Preflight failed. Resolve errors and retry import.',
        },
        items: [],
      },
      loadingImportRun: false,
    });

    render(<ImportRunStatusSection />);

    expect(screen.getByText('not dispatched')).toBeInTheDocument();
    expect(screen.getByText('Dispatch stopped at preflight')).toBeInTheDocument();
    expect(
      screen.getByText('This run did not reach the runtime queue because the preflight check failed.')
    ).toBeInTheDocument();
    expect(screen.getByText('Catalog is required.')).toBeInTheDocument();
  });

  it('renders a zero-match diagnostic when nothing was queued', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: {
          id: 'run-4',
          status: 'completed',
          dispatchMode: null,
          queueJobId: null,
          stats: {
            total: 0,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            pending: 0,
          },
          summaryMessage: 'No products matched current import filters.',
        },
        items: [],
      },
      loadingImportRun: false,
    });

    render(<ImportRunStatusSection />);

    expect(screen.getByText('No products matched the current import filters')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing was queued because item resolution returned zero import candidates.')
    ).toBeInTheDocument();
  });

  it('does not crash when the active run detail has not loaded yet', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: null,
        items: [],
      },
      loadingImportRun: true,
    });

    const { container } = render(<ImportRunStatusSection />);

    expect(container).toBeEmptyDOMElement();
  });
});
