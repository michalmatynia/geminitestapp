// @vitest-environment jsdom

import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import {
  listOptimisticAiPathRuns,
} from '@/shared/lib/ai-paths/optimistic-run-queue';
import { optimisticallyInsertAiPathRunInQueueCache } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const buildRun = (overrides?: Partial<AiPathRunRecord>): AiPathRunRecord =>
  ({
    id: 'run-1',
    pathId: 'path-1',
    pathName: 'Path 1',
    status: 'queued',
    createdAt: '2026-03-06T10:00:00.000Z',
    updatedAt: '2026-03-06T10:00:00.000Z',
    entityId: 'product-1',
    entityType: 'product',
    meta: { source: 'trigger_button' },
    ...overrides,
  }) as AiPathRunRecord;

const makeKey = (filters: Record<string, unknown>) =>
  QUERY_KEYS.ai.aiPaths.jobQueue(filters);

describe('optimisticallyInsertAiPathRunInQueueCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.localStorage.clear();
  });

  afterEach(() => {
    queryClient.clear();
    window.localStorage.clear();
  });

  // ── core insert behaviour ────────────────────────────────────────────────

  it('prepends a new run to a matching page-1 cache and increments total', () => {
    const key = makeKey({ status: 'all', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [], total: 0 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, buildRun());

    const cached = queryClient.getQueryData<{ runs: AiPathRunRecord[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(1);
    expect(cached?.runs[0].id).toBe('run-1');
    expect(cached?.total).toBe(1);
  });

  it('persists the run to the optimistic localStorage store', () => {
    queryClient.setQueryData(makeKey({ status: 'all', page: 1, pageSize: 25 }), {
      runs: [],
      total: 0,
    });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, buildRun());

    expect(listOptimisticAiPathRuns()).toHaveLength(1);
    expect(listOptimisticAiPathRuns()[0].id).toBe('run-1');
  });

  it('updates an existing run in the cache without changing total', () => {
    const run = buildRun();
    const key = makeKey({ status: 'all', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [run], total: 1 });

    const updated = { ...run, status: 'running' as const };
    optimisticallyInsertAiPathRunInQueueCache(queryClient, updated);

    const cached = queryClient.getQueryData<{ runs: AiPathRunRecord[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(1);
    expect(cached?.total).toBe(1);
    expect(cached?.runs[0].status).toBe('running');
  });

  it('respects pageSize — does not exceed the page limit after prepend', () => {
    const existing = Array.from({ length: 25 }, (_, i) =>
      buildRun({ id: `run-existing-${i}` })
    );
    const key = makeKey({ status: 'all', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: existing, total: 25 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, buildRun({ id: 'run-new' }));

    const cached = queryClient.getQueryData<{ runs: AiPathRunRecord[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(25); // still capped at pageSize
    expect(cached?.runs[0].id).toBe('run-new'); // prepended at front
    expect(cached?.total).toBe(26); // total reflects the new run
  });

  // ── filter-based exclusion ───────────────────────────────────────────────

  it('skips caches whose status filter does not match the run status', () => {
    const key = makeKey({ status: 'running', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [], total: 0 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, buildRun({ status: 'queued' }));

    const cached = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(0);
    expect(cached?.total).toBe(0);
  });

  it('skips caches whose pathId filter does not match the run pathId', () => {
    const key = makeKey({ status: 'all', pathId: 'path-other', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [], total: 0 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, buildRun({ pathId: 'path-1' }));

    const cached = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(0);
    expect(cached?.total).toBe(0);
  });

  it('excludes ai_paths_ui sources when sourceMode=exclude filter is set', () => {
    const key = makeKey({
      status: 'all',
      source: 'ai_paths_ui',
      sourceMode: 'exclude',
      page: 1,
      pageSize: 25,
    });
    queryClient.setQueryData(key, { runs: [], total: 0 });

    // trigger_button is an ai_paths_ui source → should be excluded
    optimisticallyInsertAiPathRunInQueueCache(
      queryClient,
      buildRun({ meta: { source: 'trigger_button' } })
    );

    const cached = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(0);
    expect(cached?.total).toBe(0);
  });

  // ── page-2+ behaviour ────────────────────────────────────────────────────

  it('bumps total but does not modify runs on page > 1', () => {
    const key = makeKey({ status: 'all', page: 2, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [], total: 30 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, buildRun());

    const cached = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(0); // not prepended on page 2
    expect(cached?.total).toBe(31); // total updated for correct pagination display
  });

  // ── multiple caches ──────────────────────────────────────────────────────

  it('updates all matching caches simultaneously', () => {
    const key1 = makeKey({ status: 'all', page: 1, pageSize: 25 });
    const key2 = makeKey({ status: 'queued', page: 1, pageSize: 10 });
    queryClient.setQueryData(key1, { runs: [], total: 0 });
    queryClient.setQueryData(key2, { runs: [], total: 0 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, buildRun());

    const cached1 = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key1);
    const cached2 = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key2);
    expect(cached1?.runs).toHaveLength(1);
    expect(cached2?.runs).toHaveLength(1);
  });

  // ── guard rails ──────────────────────────────────────────────────────────

  it('is a no-op when the run has no id', () => {
    const key = makeKey({ status: 'all', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [], total: 0 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, { status: 'queued' } as AiPathRunRecord);

    const cached = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(0);
    expect(listOptimisticAiPathRuns()).toHaveLength(0);
  });

  it('is a no-op when the run has no status', () => {
    const key = makeKey({ status: 'all', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [], total: 0 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, { id: 'run-1' } as AiPathRunRecord);

    const cached = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(0);
    expect(listOptimisticAiPathRuns()).toHaveLength(0);
  });

  it('is a no-op when called with null or undefined', () => {
    const key = makeKey({ status: 'all', page: 1, pageSize: 25 });
    queryClient.setQueryData(key, { runs: [], total: 0 });

    optimisticallyInsertAiPathRunInQueueCache(queryClient, null as unknown as AiPathRunRecord);
    optimisticallyInsertAiPathRunInQueueCache(
      queryClient,
      undefined as unknown as AiPathRunRecord
    );

    const cached = queryClient.getQueryData<{ runs: unknown[]; total: number }>(key);
    expect(cached?.runs).toHaveLength(0);
  });
});
