import { describe, expect, it, vi } from 'vitest';

import {
  extractAiPathRunIdFromListedRun,
  recoverEnqueuedRunByRequestId,
  toAiPathRunRecord,
} from './trigger-event-recovery';

// ── extractAiPathRunIdFromListedRun ─────────────────────────────────────────

describe('extractAiPathRunIdFromListedRun', () => {
  it('returns null for null, undefined, or non-object values', () => {
    expect(extractAiPathRunIdFromListedRun(null)).toBeNull();
    expect(extractAiPathRunIdFromListedRun(undefined)).toBeNull();
    expect(extractAiPathRunIdFromListedRun('string')).toBeNull();
    expect(extractAiPathRunIdFromListedRun(42)).toBeNull();
  });

  it('returns id from the "id" field', () => {
    expect(extractAiPathRunIdFromListedRun({ id: 'run-1' })).toBe('run-1');
  });

  it('falls back to "runId" when "id" is absent', () => {
    expect(extractAiPathRunIdFromListedRun({ runId: 'run-2', status: 'queued' })).toBe('run-2');
  });

  it('falls back to "_id" when "id" and "runId" are absent', () => {
    expect(extractAiPathRunIdFromListedRun({ _id: 'run-3' })).toBe('run-3');
  });

  it('returns null when all id fields are absent or empty', () => {
    expect(extractAiPathRunIdFromListedRun({ status: 'queued' })).toBeNull();
    expect(extractAiPathRunIdFromListedRun({ id: '', runId: '  ', _id: '' })).toBeNull();
  });

  it('"id" takes priority over "runId" and "_id"', () => {
    expect(extractAiPathRunIdFromListedRun({ id: 'run-primary', runId: 'run-fallback' })).toBe(
      'run-primary'
    );
  });
});

// ── toAiPathRunRecord ────────────────────────────────────────────────────────

describe('toAiPathRunRecord', () => {
  it('returns null for non-object input', () => {
    expect(toAiPathRunRecord(null, 'run-1')).toBeNull();
    expect(toAiPathRunRecord('string', 'run-1')).toBeNull();
  });

  it('normalises the run id and preserves existing fields', () => {
    const raw = { id: 'old-id', status: 'running', pathId: 'path-1' };
    const result = toAiPathRunRecord(raw, 'run-new');
    expect(result?.id).toBe('run-new');
    expect(result?.status).toBe('running');
    expect((result as unknown as Record<string, unknown>)['pathId']).toBe('path-1');
  });

  it('defaults status to "queued" when status field is absent', () => {
    const result = toAiPathRunRecord({ pathId: 'path-1' }, 'run-1');
    expect(result?.status).toBe('queued');
  });
});

// ── recoverEnqueuedRunByRequestId ────────────────────────────────────────────

describe('recoverEnqueuedRunByRequestId', () => {
  it('returns the recovered run on the first successful lookup', async () => {
    const lookupRuns = vi.fn().mockResolvedValue({
      ok: true,
      data: { runs: [{ id: 'run-recovered', status: 'queued' }] },
    });

    const result = await recoverEnqueuedRunByRequestId({
      pathId: 'path-1',
      requestId: 'req-1',
      lookupRuns,
      retryDelaysMs: [0],
    });

    expect(result?.runId).toBe('run-recovered');
    expect(result?.runRecord?.id).toBe('run-recovered');
    expect(lookupRuns).toHaveBeenCalledOnce();
  });

  it('retries and returns the run on a subsequent successful attempt', async () => {
    const lookupRuns = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'network error' })
      .mockResolvedValueOnce({
        ok: true,
        data: { runs: [{ id: 'run-retry', status: 'queued' }] },
      });

    const result = await recoverEnqueuedRunByRequestId({
      pathId: 'path-1',
      requestId: 'req-1',
      lookupRuns,
      retryDelaysMs: [0, 0],
    });

    expect(result?.runId).toBe('run-retry');
    expect(lookupRuns).toHaveBeenCalledTimes(2);
  });

  it('returns null when all retry attempts fail', async () => {
    const lookupRuns = vi
      .fn()
      .mockResolvedValue({ ok: false, error: 'always fails' });

    const result = await recoverEnqueuedRunByRequestId({
      pathId: 'path-1',
      requestId: 'req-1',
      lookupRuns,
      retryDelaysMs: [0, 0, 0],
    });

    expect(result).toBeNull();
    expect(lookupRuns).toHaveBeenCalledTimes(3);
  });

  it('skips runs with no valid id and continues to next attempt', async () => {
    const lookupRuns = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: { runs: [{ status: 'queued' }] } })
      .mockResolvedValueOnce({
        ok: true,
        data: { runs: [{ id: 'run-found', status: 'queued' }] },
      });

    const result = await recoverEnqueuedRunByRequestId({
      pathId: 'path-1',
      requestId: 'req-1',
      lookupRuns,
      retryDelaysMs: [0, 0],
    });

    expect(result?.runId).toBe('run-found');
  });

  it('returns null when all attempts return empty runs list', async () => {
    const lookupRuns = vi.fn().mockResolvedValue({ ok: true, data: { runs: [] } });

    const result = await recoverEnqueuedRunByRequestId({
      pathId: 'path-1',
      requestId: 'req-1',
      lookupRuns,
      retryDelaysMs: [0, 0],
    });

    expect(result).toBeNull();
  });
});
