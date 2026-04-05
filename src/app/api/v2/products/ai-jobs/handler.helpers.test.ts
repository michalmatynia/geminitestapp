import { describe, expect, it } from 'vitest';

import {
  buildEmptyProductAiJobsResponse,
  buildProductAiJobsClearResponse,
  buildProductAiJobsListResponse,
  buildProductAiJobsQueueStatusResponse,
  hasScheduledMarker,
  isLegacySchemaMismatchError,
  resolveProductAiJobsDeleteScope,
  shouldStartProductAiJobsQueue,
} from './handler.helpers';

describe('product ai-jobs handler helpers', () => {
  it('detects scheduled markers in payloads and nested context', () => {
    expect(hasScheduledMarker({ runAt: '2026-01-01T00:00:00.000Z' })).toBe(true);
    expect(hasScheduledMarker({ context: { cron: '* * * * *' } })).toBe(true);
    expect(hasScheduledMarker({ context: { unrelated: true } })).toBe(false);
    expect(hasScheduledMarker(null)).toBe(false);
  });

  it('detects legacy schema mismatch errors and queue-start conditions', () => {
    expect(isLegacySchemaMismatchError({ code: 'P2021' })).toBe(true);
    expect(isLegacySchemaMismatchError({ code: 'P2022' })).toBe(true);
    expect(isLegacySchemaMismatchError({ code: 'OTHER' })).toBe(false);

    expect(
      shouldStartProductAiJobsQueue(
        [{ status: 'pending', payload: null }],
        { running: false }
      )
    ).toBe(true);
    expect(
      shouldStartProductAiJobsQueue(
        [{ status: 'completed', payload: { scheduledAt: 'later' } }],
        { running: false }
      )
    ).toBe(true);
    expect(
      shouldStartProductAiJobsQueue(
        [{ status: 'pending', payload: null }],
        { running: true }
      )
    ).toBe(false);
  });

  it('resolves delete scope and builds response payloads', () => {
    expect(resolveProductAiJobsDeleteScope({ scope: 'terminal' })).toBe('terminal');
    expect(resolveProductAiJobsDeleteScope({ scope: 'all' })).toBe('all');
    expect(() => resolveProductAiJobsDeleteScope(undefined)).toThrow('Invalid scope');

    expect(buildProductAiJobsListResponse([{ id: 'job-1' }])).toEqual({
      jobs: [{ id: 'job-1' }],
    });
    expect(buildProductAiJobsQueueStatusResponse({ running: false })).toEqual({
      status: { running: false },
    });
    expect(buildProductAiJobsClearResponse(3)).toEqual({ success: true, count: 3 });
    expect(buildEmptyProductAiJobsResponse()).toEqual({ jobs: [] });
  });
});
