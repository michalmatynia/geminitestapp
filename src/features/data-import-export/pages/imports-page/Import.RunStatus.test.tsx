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
  getImportRunErrorItemsMock: vi.fn(),
  resolveImportRunRetryDiagnosticsMock: vi.fn(),
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
  useImportExportActions: () => mocks.useImportExportActionsMock(),
  useImportExportData: () => mocks.useImportExportDataMock(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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
  getImportRunErrorItems: (...args: unknown[]) => mocks.getImportRunErrorItemsMock(...args),
  getCustomFieldImportHistoryItems: () => [],
  getParameterSyncHistoryItems: () => [],
  hasRetryableImportItems: () => false,
  resolveImportRunRetryDiagnostics: (...args: unknown[]) =>
    mocks.resolveImportRunRetryDiagnosticsMock(...args),
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
    mocks.getImportRunErrorItemsMock.mockReturnValue([]);
    mocks.resolveImportRunRetryDiagnosticsMock.mockReturnValue(null);
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
          params: {
            directTarget: {
              type: 'sku',
              value: 'FOASW022',
            },
          },
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
    expect(screen.getByText('Exact target:')).toBeInTheDocument();
    expect(screen.getByText('SKU FOASW022')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Exact target runs always create a new product and attach a Base.com connection to it.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View in Runtime Queue' })).toHaveAttribute(
      'href',
      '/admin/ai-paths/queue?tab=product-imports&query=run-1'
    );
    expect(screen.getByRole('link', { name: 'Open JSON detail' })).toHaveAttribute(
      'href',
      '/api/v2/integrations/imports/base/runs/run-1?includeItems=true&page=1&pageSize=250'
    );
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

  it('shows scheduled automatic retries for transient pending items', () => {
    mocks.resolveImportRunRetryDiagnosticsMock.mockReturnValue({
      scheduledCount: 2,
      nextRetryAt: '2026-04-09T20:00:00.000Z',
    });

    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: {
          id: 'run-retry',
          status: 'running',
          dispatchMode: 'queued',
          queueJobId: 'job-retry',
          stats: {
            total: 2,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            pending: 2,
          },
          summaryMessage: 'Retrying transient import failures.',
        },
        items: [],
      },
      loadingImportRun: false,
    });

    render(<ImportRunStatusSection />);

    expect(screen.getByText('Automatic retries')).toBeInTheDocument();
    expect(
      screen.getByText('2 items currently waiting for the next retry window.')
    ).toBeInTheDocument();
    expect(screen.getByText('2026-04-09T20:00:00.000Z')).toBeInTheDocument();
  });

  it('explains what the resume action will requeue', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: {
          id: 'run-resume',
          status: 'failed',
          dispatchMode: 'queued',
          queueJobId: 'job-resume',
          stats: {
            total: 2,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 1,
            pending: 1,
          },
          summaryMessage: 'Import completed with resumable items.',
        },
        items: [
          {
            id: 'item-failed',
            runId: 'run-resume',
            externalId: 'external-failed',
            itemId: '1001',
            sku: 'SKU-FAILED',
            status: 'failed',
            retryable: true,
            attempt: 1,
            createdAt: '2026-04-09T19:54:40.000Z',
            updatedAt: '2026-04-09T19:54:42.000Z',
          },
          {
            id: 'item-pending',
            runId: 'run-resume',
            externalId: 'external-pending',
            itemId: '1002',
            sku: 'SKU-PENDING',
            status: 'pending',
            attempt: 0,
            createdAt: '2026-04-09T19:54:41.000Z',
            updatedAt: '2026-04-09T19:54:43.000Z',
          },
        ],
      },
      loadingImportRun: false,
    });

    render(<ImportRunStatusSection />);

    expect(screen.getByText('Resume scope')).toBeInTheDocument();
    expect(screen.getAllByText(/Resume failed/)).toHaveLength(2);
    expect(screen.getByText(/will requeue 2 items from this run/)).toBeInTheDocument();
    expect(screen.getByText('Failed 1 · Pending 1 · Marked retryable 1')).toBeInTheDocument();
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

  it('renders the latest run-level failure cause when the import failed after dispatch', () => {
    mocks.getImportRunErrorItemsMock.mockReturnValue([
      {
        id: 'item-1',
        runId: 'run-5',
        externalId: 'external-1',
        itemId: '9568407',
        sku: 'FOASW022',
        status: 'failed',
        errorCode: 'VALIDATION_ERROR',
        errorClass: 'permanent',
        errorMessage:
          'Validation failed for FOASW022. name_en: English name must use format: <name> | <size> | <material> | <category> | <lore or theme>',
        attempt: 2,
        retryable: false,
        createdAt: '2026-04-09T19:54:40.000Z',
        updatedAt: '2026-04-09T19:54:42.000Z',
      },
    ]);

    mocks.useImportExportDataMock.mockReturnValue({
      activeImportRun: {
        run: {
          id: 'run-5',
          status: 'failed',
          dispatchMode: 'queued',
          queueJobId: 'job-5',
          errorCode: 'VALIDATION_ERROR',
          error:
            'Validation failed for FOASW022. name_en: English name must use format: <name> | <size> | <material> | <category> | <lore or theme>',
          stats: {
            total: 1,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 1,
            pending: 0,
          },
          summaryMessage:
            'Import completed: 0 imported, 0 updated, 0 skipped, 1 failed. Latest failure: FOASW022 [VALIDATION_ERROR]: Validation failed for FOASW022.',
        },
        items: [],
      },
      loadingImportRun: false,
    });

    render(<ImportRunStatusSection />);

    expect(screen.getByText('Latest failure')).toBeInTheDocument();
    expect(screen.getAllByText('VALIDATION_ERROR')).toHaveLength(2);
    expect(screen.getByText('Recent failed items')).toBeInTheDocument();
    expect(screen.getByText('FOASW022')).toBeInTheDocument();
    expect(screen.getByText('Item 9568407')).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText('permanent')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Validation failed for FOASW022\. name_en: English name must use format:/
      )
    ).toHaveLength(2);
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
