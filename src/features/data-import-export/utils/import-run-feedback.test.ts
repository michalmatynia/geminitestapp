import { describe, expect, it } from 'vitest';

import {
  areImportResponsesEquivalent,
  buildImportResponseFromRun,
  buildImportResultToast,
  getImportResultDisplaySummary,
  resolveLiveImportResult,
} from './import-run-feedback';

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

  it('labels queued exact-target imports as detached exact imports', () => {
    const result = {
      runId: 'run-exact-1',
      status: 'queued' as const,
      dispatchMode: 'queued' as const,
      queueJobId: 'job-exact-1',
      summaryMessage: 'Queued exact SKU FOASW022 target for new product creation.',
    };

    expect(getImportResultDisplaySummary(result)).toEqual({
      dispatchModeLabel: 'queued (base-import runtime queue)',
      queueJobLabel: 'job-exact-1',
      explanation:
        'This exact-target run was submitted to the separate base-import runtime queue and will create a new detached product.',
    });

    expect(buildImportResultToast(result, { kind: 'import', dryRun: false })).toEqual({
      message: 'Exact import queued to base-import runtime (job job-exact-1).',
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

  it('builds an import response snapshot from a live run record', () => {
    expect(
      buildImportResponseFromRun({
        id: 'run-4',
        status: 'completed',
        dispatchMode: 'queued',
        queueJobId: 'job-4',
        summaryMessage: 'Import completed.',
        preflight: null,
      } as never)
    ).toEqual({
      runId: 'run-4',
      status: 'completed',
      dispatchMode: 'queued',
      queueJobId: 'job-4',
      summaryMessage: 'Import completed.',
      preflight: null,
    });
  });

  it('prefers the live run state for the same run id', () => {
    expect(
      resolveLiveImportResult(
        {
          runId: 'run-5',
          status: 'queued',
          dispatchMode: 'queued',
          queueJobId: 'job-5',
          summaryMessage: 'Queued 1 products for import.',
        },
        {
          id: 'run-5',
          status: 'completed',
          dispatchMode: 'queued',
          queueJobId: 'job-5',
          summaryMessage: 'Import completed.',
          preflight: null,
        } as never
      )
    ).toEqual({
      runId: 'run-5',
      status: 'completed',
      dispatchMode: 'queued',
      queueJobId: 'job-5',
      summaryMessage: 'Import completed.',
      preflight: null,
    });
  });

  it('compares import responses by value, not object identity', () => {
    expect(
      areImportResponsesEquivalent(
        {
          runId: 'run-6',
          status: 'completed',
          dispatchMode: 'queued',
          queueJobId: 'job-6',
          summaryMessage: 'Done.',
          preflight: null,
        },
        {
          runId: 'run-6',
          status: 'completed',
          dispatchMode: 'queued',
          queueJobId: 'job-6',
          summaryMessage: 'Done.',
          preflight: null,
        }
      )
    ).toBe(true);
  });
});
