// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { logger } from '@/shared/utils/logger';

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

const createQuotaError = (): Error & { name: string } => {
  const error = new Error('Quota exceeded') as Error & { name: string };
  error.name = 'QuotaExceededError';
  return error;
};
const QUEUE_STORAGE_KEY = 'ai-paths-optimistic-run-queue';

const resetOptimisticQueueForTests = () => {
  const existingIds = listOptimisticAiPathRuns().map((run) => run.id);
  if (existingIds.length > 0) {
    removeOptimisticAiPathRuns(existingIds);
  }
  window.localStorage.clear();
};

describe('optimistic-run-queue', () => {
  beforeEach(() => {
    resetOptimisticQueueForTests();
  });

  afterEach(() => {
    resetOptimisticQueueForTests();
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

  it('does not throw if localStorage setItem hits quota and keeps run in memory', () => {
    const quotaError = createQuotaError();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError;
    });

    expect(() => rememberOptimisticAiPathRun(buildRun({ id: 'quota-run' }))).not.toThrow();

    expect(listOptimisticAiPathRuns()).toHaveLength(1);
    expect(listOptimisticAiPathRuns()[0].id).toBe('quota-run');
    expect(setItemSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('keeps optimistic runs in memory during quota failures and persists once storage recovers', () => {
    const quotaError = createQuotaError();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError;
    });

    expect(() => rememberOptimisticAiPathRun(buildRun({ id: 'transient-run' }))).not.toThrow();
    expect(listOptimisticAiPathRuns()).toHaveLength(1);
    expect(window.localStorage.getItem(QUEUE_STORAGE_KEY)).toBeNull();

    setItemSpy.mockRestore();

    expect(() => rememberOptimisticAiPathRun(buildRun({ id: 'recovered-run' }))).not.toThrow();

    const persisted = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    expect(persisted).toBeTruthy();
    const parsed = persisted ? JSON.parse(persisted) : [];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);

    const ids = parsed.map((entry: { run: { id: string } }) => entry.run.id);
    expect(ids).toEqual(expect.arrayContaining(['transient-run', 'recovered-run']));

    expect(listOptimisticAiPathRuns({ status: 'queued' })).toHaveLength(2);
  });

  it('logs fallback telemetry when localStorage write fails', () => {
    const quotaError = createQuotaError();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError;
    });
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    expect(() => rememberOptimisticAiPathRun(buildRun({ id: 'warn-fallback' }))).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to in-memory'),
      expect.objectContaining({
        event: 'fallback',
      })
    );

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('falls back to in-memory queue when localStorage read also throws', () => {
    const storageFailure = createQuotaError();
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw storageFailure;
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw storageFailure;
    });

    expect(() => rememberOptimisticAiPathRun(buildRun({ id: 'broken-storage-run' }))).not.toThrow();
    expect(listOptimisticAiPathRuns()).toHaveLength(1);
    expect(listOptimisticAiPathRuns()[0].id).toBe('broken-storage-run');
    expect(setItemSpy).toHaveBeenCalled();
    expect(getItemSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('can remove queued runs while staying functional under storage write failures', () => {
    const storageFailure = createQuotaError();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw storageFailure;
    });

    rememberOptimisticAiPathRun(buildRun({ id: 'removal-run' }));
    expect(listOptimisticAiPathRuns()).toHaveLength(1);

    removeOptimisticAiPathRun('removal-run');
    expect(listOptimisticAiPathRuns()).toHaveLength(0);
    expect(setItemSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  it('logs normalization telemetry when stored payload is compacted to fit queue constraints', () => {
    const now = Date.now();
    const oversizedPayload = Array.from({ length: 55 }, (_, index) => ({
      expiresAt: now + 60_000,
      run: buildRun({
        id: `stored-${index.toString().padStart(2, '0')}`,
      }),
    }));
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(oversizedPayload));

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const runs = listOptimisticAiPathRuns();
    expect(runs).toHaveLength(50);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('normalized stored payload before persisting'),
      expect.objectContaining({
        event: 'normalized',
        persistedCount: 55,
        normalizedCount: 50,
      })
    );

    warnSpy.mockRestore();
  });

  it('logs trimmed telemetry when reduced variant size is needed to persist', () => {
    const now = Date.now();
    const fullPayload = Array.from({ length: 50 }, (_, index) => ({
      expiresAt: now + 60_000,
      run: buildRun({
        id: `trimmed-${index.toString().padStart(2, '0')}`,
      }),
    }));
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(fullPayload));

    const quotaError = createQuotaError();
    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw quotaError;
      })
      .mockImplementation(function (key: string, value: string) {
        return originalSetItem.call(this, key, value);
      });
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    expect(() => rememberOptimisticAiPathRun(buildRun({ id: 'trimmed-retry' }))).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('trimmed optimistic runs before storage persist'),
      expect.objectContaining({
        event: 'trimmed',
        normalizedCount: 50,
        persistedCount: 25,
      })
    );

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('persists with the minimum retry window when first two trim variants still fail', () => {
    const now = Date.now();
    const fullPayload = Array.from({ length: 50 }, (_, index) => ({
      expiresAt: now + 60_000,
      run: buildRun({
        id: `retry-min-${index.toString().padStart(2, '0')}`,
      }),
    }));
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(fullPayload));

    let setItemCalls = 0;
    const quotaError = createQuotaError();
    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (key: string, value: string) {
        setItemCalls += 1;
        if (setItemCalls <= 2) {
          throw quotaError;
        }
        return originalSetItem.call(this, key, value);
      });
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    expect(() => rememberOptimisticAiPathRun(buildRun({ id: 'retry-min-run' }))).not.toThrow();

    const persistedRaw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    expect(persistedRaw).toBeTruthy();
    const parsed = persistedRaw ? JSON.parse(persistedRaw) : [];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(10);
    expect(setItemCalls).toBe(3);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('trimmed optimistic runs before storage persist'),
      expect.objectContaining({
        event: 'trimmed',
        normalizedCount: 50,
        persistedCount: 10,
      })
    );
    expect(
      warnSpy
    ).not.toHaveBeenCalledWith(
      expect.stringContaining('falling back to in-memory optimistic run queue'),
      expect.objectContaining({
        event: 'fallback',
      })
    );

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('keeps only a bounded number of optimistic runs', () => {
    Array.from({ length: 70 }).forEach((_, index) => {
      rememberOptimisticAiPathRun(buildRun({ id: `run-${index.toString().padStart(3, '0')}` }));
    });

    expect(listOptimisticAiPathRuns()).toHaveLength(50);
  });

  it('stores compact run payload without heavy run fields', () => {
    const longBlob = 'x'.repeat(2000);
    rememberOptimisticAiPathRun(
      buildRun({
        id: 'run-heavy',
        context: {
          notes: longBlob,
          details: longBlob,
        },
        runtimeState: { longBlob },
        meta: {
          source: 'trigger_button',
          executionMode: 'server',
          runtime: {
            executionMode: 'server',
            diagnostics: longBlob,
          },
          customData: longBlob,
        } as Record<string, unknown>,
      })
    );

    const persistedRaw = window.localStorage.getItem('ai-paths-optimistic-run-queue');
    expect(persistedRaw).toBeTruthy();
    const parsed = persistedRaw ? JSON.parse(persistedRaw) : [];
    const persistedRun = parsed?.[0]?.run ?? {};

    expect(persistedRun).toMatchObject({
      id: 'run-heavy',
      status: 'queued',
      meta: {
        source: 'trigger_button',
        executionMode: 'server',
        runtime: { executionMode: 'server' },
      },
    });
    expect(persistedRun).not.toHaveProperty('context');
    expect(persistedRun).not.toHaveProperty('runtimeState');
  });

  it('rewrites malformed legacy queue payload to a compact format and enforces queue bounds', () => {
    const now = Date.now();
    const heavyPayload = 'x'.repeat(2000);
    const legacyEntries = Array.from({ length: 55 }, (_, index) => {
      const id = `legacy-${index.toString().padStart(2, '0')}`;
      const createdAt = new Date(now + index).toISOString();
      return {
        expiresAt: now + 30_000,
        run: {
          ...buildRun({
            id,
            createdAt,
            updatedAt: createdAt,
          }),
          context: { heavyPayload },
          runtimeState: {
            heavyPayload,
          },
          graph: {
            nodes: [],
            edges: [],
          },
          meta: {
            source: 'trigger_button',
            executionMode: 'server',
            customContext: { heavyPayload },
            runtime: {
              executionMode: 'server',
              diagnostics: heavyPayload,
            },
          },
        },
      };
    });
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(legacyEntries));

    const runs = listOptimisticAiPathRuns();
    expect(runs).toHaveLength(50);

    const persistedRaw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    expect(persistedRaw).toBeTruthy();
    const persistedEntries = persistedRaw ? JSON.parse(persistedRaw) : [];
    expect(Array.isArray(persistedEntries)).toBe(true);
    expect(persistedEntries).toHaveLength(50);

    const persistedRun = persistedEntries?.[0]?.run ?? {};
    expect(persistedRun).not.toHaveProperty('context');
    expect(persistedRun).not.toHaveProperty('runtimeState');
    expect(persistedRun).not.toHaveProperty('graph');
    expect(persistedRun).toMatchObject({
      status: 'queued',
      meta: {
        source: 'trigger_button',
        executionMode: 'server',
        runtime: {
          executionMode: 'server',
        },
      },
    });
  });

  it('drops expired stored runs and keeps only active entries', () => {
    const now = Date.now();
    const payload = [
      {
        expiresAt: now - 10_000,
        run: buildRun({ id: 'expired-run' }),
      },
      {
        expiresAt: now + 10_000,
        run: buildRun({ id: 'active-run' }),
      },
    ];
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(payload));

    const runs = listOptimisticAiPathRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('active-run');

    const persistedRaw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    expect(persistedRaw).toBeTruthy();
    const persistedEntries = persistedRaw ? JSON.parse(persistedRaw) : [];
    expect(Array.isArray(persistedEntries)).toBe(true);
    expect(persistedEntries).toHaveLength(1);
    expect(persistedEntries[0]?.run?.id).toBe('active-run');
  });

  it('ignores malformed localStorage payloads and clears storage', () => {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, '{"invalid":true}');

    expect(listOptimisticAiPathRuns()).toHaveLength(0);
    expect(window.localStorage.getItem(QUEUE_STORAGE_KEY)).toBeNull();
  });

  it('logs malformed localStorage payload warnings', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    window.localStorage.setItem(QUEUE_STORAGE_KEY, '{"invalid":true}');
    listOptimisticAiPathRuns();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid stored payload (non-array), clearing storage'),
      expect.objectContaining({
        event: 'storage-invalid',
        source: 'non-array-payload',
      })
    );

    window.localStorage.setItem(QUEUE_STORAGE_KEY, 'not-json');
    listOptimisticAiPathRuns();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid stored payload (json parse failure)'),
      expect.objectContaining({
        event: 'storage-invalid',
      })
    );

    warnSpy.mockRestore();
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
