// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

import {
  aiPathRunMatchesFilters,
  listOptimisticAiPathRuns,
  mergeAiPathQueuePayloadWithOptimisticRuns,
  patchQueuedCountWithOptimisticRuns,
  previewAiPathQueuePayloadWithOptimisticRuns,
  rememberOptimisticAiPathRun,
  removeOptimisticAiPathRun,
  removeOptimisticAiPathRuns,
} from '../optimistic-run-queue';

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
    meta: {
      source: 'trigger_button',
    },
    ...overrides,
  }) as AiPathRunRecord;

describe('optimistic-run-queue', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('merges remembered optimistic runs into the first queue page', () => {
    rememberOptimisticAiPathRun(buildRun());

    const merged = mergeAiPathQueuePayloadWithOptimisticRuns(
      { runs: [], total: 0 },
      {
        limit: 25,
        offset: 0,
        status: 'all',
      }
    );

    expect(merged.total).toBe(1);
    expect(merged.runs).toHaveLength(1);
    expect(merged.runs[0]).toMatchObject({
      id: 'run-1',
      entityId: 'product-1',
      status: 'queued',
    });
  });

  it('previews remembered optimistic runs without consuming local storage entries', () => {
    rememberOptimisticAiPathRun(buildRun());

    const preview = previewAiPathQueuePayloadWithOptimisticRuns(
      { runs: [], total: 0 },
      {
        limit: 25,
        offset: 0,
        status: 'all',
      }
    );

    expect(preview.total).toBe(1);
    expect(preview.runs).toHaveLength(1);
    expect(listOptimisticAiPathRuns()).toHaveLength(1);
  });

  it('deduplicates optimistic runs once the server returns the same run id', () => {
    const run = buildRun();
    rememberOptimisticAiPathRun(run);

    const merged = mergeAiPathQueuePayloadWithOptimisticRuns(
      { runs: [run], total: 1 },
      {
        limit: 25,
        offset: 0,
      }
    );

    expect(merged.total).toBe(1);
    expect(merged.runs).toEqual([run]);
    expect(listOptimisticAiPathRuns()).toEqual([]);
  });

  it('patches queued count only when the server still reports zero queued runs', () => {
    rememberOptimisticAiPathRun(buildRun());

    expect(
      patchQueuedCountWithOptimisticRuns({
        queuedCount: 0,
        activeRuns: 0,
      })
    ).toMatchObject({
      queuedCount: 1,
      activeRuns: 0,
    });

    expect(
      patchQueuedCountWithOptimisticRuns({
        queuedCount: 2,
        activeRuns: 0,
      })
    ).toMatchObject({
      queuedCount: 2,
      activeRuns: 0,
    });
  });

  it('does not prepend optimistic runs on pages beyond the first (offset > 0)', () => {
    rememberOptimisticAiPathRun(buildRun());

    const merged = mergeAiPathQueuePayloadWithOptimisticRuns(
      { runs: [], total: 0 },
      { limit: 25, offset: 25 }
    );

    expect(merged.total).toBe(0);
    expect(merged.runs).toHaveLength(0);
  });

  it('removeOptimisticAiPathRun removes a single run by id', () => {
    rememberOptimisticAiPathRun(buildRun({ id: 'run-a' }));
    rememberOptimisticAiPathRun(buildRun({ id: 'run-b' }));

    removeOptimisticAiPathRun('run-a');

    const remaining = listOptimisticAiPathRuns();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('run-b');
  });

  it('removeOptimisticAiPathRuns removes multiple runs by id', () => {
    rememberOptimisticAiPathRun(buildRun({ id: 'run-a' }));
    rememberOptimisticAiPathRun(buildRun({ id: 'run-b' }));
    rememberOptimisticAiPathRun(buildRun({ id: 'run-c' }));

    removeOptimisticAiPathRuns(['run-a', 'run-c']);

    const remaining = listOptimisticAiPathRuns();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('run-b');
  });

  it('listOptimisticAiPathRuns filters by status', () => {
    rememberOptimisticAiPathRun(buildRun({ id: 'run-queued', status: 'queued' }));
    rememberOptimisticAiPathRun(buildRun({ id: 'run-running', status: 'running' }));

    const queued = listOptimisticAiPathRuns({ status: 'queued' });
    expect(queued).toHaveLength(1);
    expect(queued[0].id).toBe('run-queued');
  });

  it('listOptimisticAiPathRuns filters by pathId', () => {
    rememberOptimisticAiPathRun(buildRun({ id: 'run-1', pathId: 'path-alpha' }));
    rememberOptimisticAiPathRun(buildRun({ id: 'run-2', pathId: 'path-beta' }));

    const results = listOptimisticAiPathRuns({ pathId: 'path-alpha' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('run-1');
  });

  it('listOptimisticAiPathRuns filters by query against run fields', () => {
    rememberOptimisticAiPathRun(buildRun({ id: 'run-abc', pathName: 'Generate Description' }));
    rememberOptimisticAiPathRun(buildRun({ id: 'run-xyz', pathName: 'Translate Content' }));

    const results = listOptimisticAiPathRuns({ query: 'generate' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('run-abc');
  });

  describe('aiPathRunMatchesFilters — source filter', () => {
    const triggerButtonRun = buildRun({ meta: { source: 'trigger_button' } });
    const externalRun = buildRun({ meta: { source: 'external_api' } });

    it('includes ai_paths_ui sources when source=ai_paths_ui and mode=include', () => {
      expect(
        aiPathRunMatchesFilters(triggerButtonRun, { source: 'ai_paths_ui', sourceMode: 'include' })
      ).toBe(true);
    });

    it('excludes non-ai_paths_ui sources when source=ai_paths_ui and mode=include', () => {
      expect(
        aiPathRunMatchesFilters(externalRun, { source: 'ai_paths_ui', sourceMode: 'include' })
      ).toBe(false);
    });

    it('excludes ai_paths_ui sources when source=ai_paths_ui and mode=exclude', () => {
      expect(
        aiPathRunMatchesFilters(triggerButtonRun, { source: 'ai_paths_ui', sourceMode: 'exclude' })
      ).toBe(false);
    });

    it('includes non-ai_paths_ui sources when source=ai_paths_ui and mode=exclude', () => {
      expect(
        aiPathRunMatchesFilters(externalRun, { source: 'ai_paths_ui', sourceMode: 'exclude' })
      ).toBe(true);
    });
  });
});
