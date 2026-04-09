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
    });

    render(<ImportLastResultSection />);

    expect(screen.getByText('queued (base-import runtime queue)')).toBeInTheDocument();
    expect(screen.getByText('job-1')).toBeInTheDocument();
    expect(
      screen.getByText('This run was submitted to the separate base-import runtime queue.')
    ).toBeInTheDocument();
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
    });

    render(<ImportLastResultSection />);

    expect(screen.getByText('not dispatched')).toBeInTheDocument();
    expect(screen.getByText('not assigned')).toBeInTheDocument();
    expect(
      screen.getByText('Dispatch stopped at preflight before this run reached runtime queueing.')
    ).toBeInTheDocument();
    expect(screen.getByText('• Catalog is required.')).toBeInTheDocument();
  });
});
