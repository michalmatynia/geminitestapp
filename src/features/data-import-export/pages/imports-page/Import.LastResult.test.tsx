/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useImportExportDataMock: vi.fn(),
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
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

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    title,
    children,
    ...props
  }: {
    title?: React.ReactNode;
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </div>
  ),
  Hint: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ status }: { status: string }) => <div>{status}</div>,
}));

import { ImportLastResultSection } from './Import.LastResult';

describe('ImportLastResultSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders queued runtime summary details', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      lastResult: {
        runId: 'run-1',
        status: 'queued',
        dispatchMode: 'queued',
        queueJobId: 'job-1',
        summaryMessage: 'Queued 10 products for import.',
      },
      activeImportRunId: 'run-1',
      activeImportRun: null,
    });

    render(<ImportLastResultSection />);

    expect(screen.getByText('queued (base-import runtime queue)')).toBeInTheDocument();
    expect(screen.getByText('job-1')).toBeInTheDocument();
    expect(
      screen.getByText('This run was submitted to the separate base-import runtime queue.')
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

  it('renders preflight-blocked summary details', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      lastResult: {
        runId: 'run-2',
        status: 'failed',
        dispatchMode: null,
        queueJobId: null,
        summaryMessage: 'Preflight failed. Resolve errors and retry import.',
        preflight: {
          ok: false,
          checkedAt: '2026-04-09T18:00:00.000Z',
          issues: [{ code: 'MISSING_CATALOG', message: 'Catalog is required.', severity: 'error' }],
        },
      },
      activeImportRunId: 'run-2',
      activeImportRun: null,
    });

    render(<ImportLastResultSection />);

    expect(screen.getByText('not dispatched')).toBeInTheDocument();
    expect(screen.getByText('not assigned')).toBeInTheDocument();
    expect(
      screen.getByText('Dispatch stopped at preflight before this run reached runtime queueing.')
    ).toBeInTheDocument();
    expect(screen.getByText('• Catalog is required.')).toBeInTheDocument();
  });

  it('renders the latest run failure cause when the active run matches the last result', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      lastResult: {
        runId: 'run-3',
        status: 'failed',
        dispatchMode: 'queued',
        queueJobId: 'job-3',
        summaryMessage:
          'Import completed: 0 imported, 0 updated, 0 skipped, 1 failed. Latest failure: FOASW022 [VALIDATION_ERROR]: Validation failed for FOASW022.',
      },
      activeImportRunId: 'run-3',
      activeImportRun: {
        run: {
          id: 'run-3',
          errorCode: 'VALIDATION_ERROR',
          error:
            'Validation failed for FOASW022. name_en: English name must use format: <name> | <size> | <material> | <category> | <lore or theme>',
        },
      },
    });

    render(<ImportLastResultSection />);

    expect(screen.getByText('Latest failure')).toBeInTheDocument();
    expect(screen.getByText('VALIDATION_ERROR')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Validation failed for FOASW022\. name_en: English name must use format:/
      )
    ).toBeInTheDocument();
  });

  it('prefers the refreshed active run status over the initial queued start response', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      lastResult: {
        runId: 'run-4',
        status: 'queued',
        dispatchMode: 'queued',
        queueJobId: 'job-4',
        summaryMessage: 'Queued 1 products for import.',
      },
      activeImportRunId: 'run-4',
      activeImportRun: {
        run: {
          id: 'run-4',
          status: 'completed',
          dispatchMode: 'queued',
          queueJobId: 'job-4',
          summaryMessage: 'Import completed: 1 imported, 0 updated, 0 skipped, 0 failed.',
        },
      },
    });

    render(<ImportLastResultSection />);

    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(
      screen.getByText('Import completed: 1 imported, 0 updated, 0 skipped, 0 failed.')
    ).toBeInTheDocument();
  });

  it('shows exact-target detached-create context when the active run includes a direct target', () => {
    mocks.useImportExportDataMock.mockReturnValue({
      lastResult: {
        runId: 'run-exact-2',
        status: 'queued',
        dispatchMode: 'queued',
        queueJobId: 'job-exact-2',
        summaryMessage: 'Queued exact SKU FOASW022 target for new product creation.',
      },
      activeImportRunId: 'run-exact-2',
      activeImportRun: {
        run: {
          id: 'run-exact-2',
          status: 'queued',
          dispatchMode: 'queued',
          queueJobId: 'job-exact-2',
          summaryMessage: 'Queued exact SKU FOASW022 target for new product creation.',
          params: {
            directTarget: {
              type: 'sku',
              value: 'FOASW022',
            },
          },
        },
      },
    });

    render(<ImportLastResultSection />);

    expect(screen.getByText('Exact target:')).toBeInTheDocument();
    expect(screen.getByText('SKU FOASW022')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This exact-target run was submitted to the separate base-import runtime queue and will create a new detached product.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Exact target runs always create a new detached product and do not reuse Base sync linkage.'
      )
    ).toBeInTheDocument();
  });
});
