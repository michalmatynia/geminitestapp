import { describe, expect, it } from 'vitest';

import { buildImportResultToast, getImportResultDisplaySummary } from './import-run-feedback';

describe('import-run-feedback', () => {
  it('builds queued runtime feedback with queue job id', () => {
    const result = {
      runId: 'run-1',
      status: 'queued' as const,
      dispatchMode: 'queued' as const,
      queueJobId: 'job-1',
      summaryMessage: 'Queued 10 products for import.',
    };

    expect(getImportResultDisplaySummary(result)).toEqual({
      dispatchModeLabel: 'queued (base-import runtime queue)',
      queueJobLabel: 'job-1',
      explanation: 'This run was submitted to the separate base-import runtime queue.',
    });

    expect(buildImportResultToast(result, { kind: 'import', dryRun: false })).toEqual({
      message: 'Import queued to base-import runtime (job job-1).',
      toast: { variant: 'success' },
    });
  });

  it('builds inline fallback feedback', () => {
    const result = {
      runId: 'run-2',
      status: 'running' as const,
      dispatchMode: 'inline' as const,
      queueJobId: 'inline-123',
      summaryMessage: 'Import running inline.',
    };

    expect(getImportResultDisplaySummary(result)).toEqual({
      dispatchModeLabel: 'inline fallback',
      queueJobLabel: 'inline-123',
      explanation:
        'This run used inline fallback because Redis queueing was unavailable or enqueueing failed.',
    });

    expect(buildImportResultToast(result, { kind: 'resume' })).toEqual({
      message: 'Import resume running inline (job inline-123).',
      toast: { variant: 'warning' },
    });
  });

  it('builds preflight-blocked feedback', () => {
    const result = {
      runId: 'run-3',
      status: 'failed' as const,
      dispatchMode: null,
      queueJobId: null,
      summaryMessage: 'Preflight failed. Resolve errors and retry import.',
      preflight: {
        ok: false,
        checkedAt: '2026-04-09T18:00:00.000Z',
        issues: [{ code: 'MISSING_CATALOG', message: 'Catalog is required.', severity: 'error' as const }],
      },
    };

    expect(getImportResultDisplaySummary(result)).toEqual({
      dispatchModeLabel: 'not dispatched',
      queueJobLabel: 'not assigned',
      explanation: 'Dispatch stopped at preflight before this run reached runtime queueing.',
    });

    expect(buildImportResultToast(result, { kind: 'import' })).toEqual({
      message: 'Import blocked before dispatch: Catalog is required.',
      toast: { variant: 'error' },
    });
  });
});
