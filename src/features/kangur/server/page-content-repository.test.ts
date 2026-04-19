import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDefaultKangurPageContentStore } from '@/features/kangur/ai-tutor/page-content-catalog';
import { parseKangurPageContentStore } from '@/shared/contracts/kangur-page-content';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));
const { buildDefaultKangurPageContentStoreSpy } = vi.hoisted(() => ({
  buildDefaultKangurPageContentStoreSpy: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/features/kangur/ai-tutor/page-content-catalog', async () => {
  const actual = await vi.importActual<typeof import('@/features/kangur/ai-tutor/page-content-catalog')>(
    '@/features/kangur/ai-tutor/page-content-catalog'
  );

  return {
    ...actual,
    buildDefaultKangurPageContentStore: (
      ...args: Parameters<typeof actual.buildDefaultKangurPageContentStore>
    ) => {
      buildDefaultKangurPageContentStoreSpy(...args);
      return actual.buildDefaultKangurPageContentStore(...args);
    },
  };
});

import {
  clearKangurPageContentServerCache,
  getKangurPageContentStore,
  upsertKangurPageContentStore,
} from './page-content-repository';

describe('page-content repository cache', () => {
  const docsByLocale = new Map<string, unknown[]>();
  const collection = {
    bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
    createIndex: vi.fn().mockResolvedValue('ok'),
    deleteMany: vi.fn().mockResolvedValue({ acknowledged: true, deletedCount: 0 }),
    find: vi.fn((query: { locale: string }) => ({
      limit: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue(null),
      }),
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(docsByLocale.get(query.locale) ?? []),
      }),
    })),
  };
  const db = {
    collection: vi.fn(() => collection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    docsByLocale.clear();
    getMongoDbMock.mockResolvedValue(db);
    clearKangurPageContentServerCache();
  });

  it('reuses the cached store for repeated locale reads', async () => {
    const first = await getKangurPageContentStore('en');
    const second = await getKangurPageContentStore('en');

    expect(collection.find).toHaveBeenCalledTimes(1);
    expect(buildDefaultKangurPageContentStoreSpy).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('deduplicates concurrent locale reads while the first fetch is in flight', async () => {
    let resolveDocs: ((docs: unknown[]) => void) | null = null;
    const docsPromise = new Promise<unknown[]>((resolve) => {
      resolveDocs = resolve;
    });
    collection.find.mockImplementationOnce((query: { locale: string }) => ({
      limit: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue(null),
      }),
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockReturnValue(docsPromise),
      }),
    }));

    const firstPromise = getKangurPageContentStore('de');
    const secondPromise = getKangurPageContentStore('de');

    await vi.waitFor(() => {
      expect(collection.find).toHaveBeenCalledTimes(1);
    });

    resolveDocs?.(docsByLocale.get('de') ?? []);
    await Promise.all([firstPromise, secondPromise]);
  });

  it('serves the updated locale store from cache immediately after upsert', async () => {
    const updatedStore = parseKangurPageContentStore({
      locale: 'de',
      version: 1,
      entries: [
        {
          id: 'tests-intro',
          pageKey: 'Tests',
          screenKey: 'list',
          surface: 'test',
          route: '/tests',
          componentId: 'tests-intro',
          widget: 'KangurPageIntroCard',
          sourcePath: 'src/features/kangur/ui/pages/Tests.tsx',
          title: 'Neue Tests',
          summary: 'Aktualisierte Tests-Einleitung.',
          body: 'Direkt aus dem Cache nach dem Speichern.',
          anchorIdPrefix: 'kangur-tests-intro',
          focusKind: 'screen',
          contentIdPrefixes: ['tests:list'],
          nativeGuideIds: [],
          triggerPhrases: ['tests'],
          tags: ['page-content', 'tests'],
          enabled: true,
          sortOrder: 10,
        },
      ],
    });

    await upsertKangurPageContentStore(updatedStore);
    collection.find.mockClear();

    const reread = await getKangurPageContentStore('de');

    expect(collection.find).not.toHaveBeenCalled();
    expect(reread).toEqual(updatedStore);
  });

  it('returns defaults immediately even when index creation and first-write persistence are still pending', async () => {
    const neverSettles = new Promise<never>(() => {});
    collection.createIndex.mockReturnValue(neverSettles);
    collection.bulkWrite.mockReturnValue(neverSettles);
    collection.deleteMany.mockReturnValue(neverSettles);

    const resolved = await Promise.race([
      getKangurPageContentStore('uk').then((store) => ({
        status: 'resolved' as const,
        store,
      })),
      new Promise<{ status: 'timeout' }>((resolve) => {
        setTimeout(() => resolve({ status: 'timeout' }), 25);
      }),
    ]);

    expect(resolved.status).toBe('resolved');
    if (resolved.status === 'resolved') {
      expect(resolved.store.locale).toBe('uk');
      expect(resolved.store.entries.length).toBeGreaterThan(0);
    }
  });

  it('returns the merged store immediately even when syncing updated defaults is still pending', async () => {
    const defaults = buildDefaultKangurPageContentStore('de');
    const [firstEntry, ...restEntries] = defaults.entries;
    const staleStore = parseKangurPageContentStore({
      locale: 'de',
      version: defaults.version,
      entries:
        firstEntry !== undefined
          ? [{ ...firstEntry, summary: 'Stale Mongo summary.' }, ...restEntries.slice(0, 1)]
          : [],
    });
    const neverSettles = new Promise<never>(() => {});
    collection.createIndex.mockReturnValue(neverSettles);
    collection.bulkWrite.mockReturnValue(neverSettles);
    collection.deleteMany.mockReturnValue(neverSettles);
    docsByLocale.set(
      'de',
      staleStore.entries.map((entry) => ({
        ...entry,
        locale: 'de',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }))
    );

    const resolved = await Promise.race([
      getKangurPageContentStore('de').then((store) => ({
        status: 'resolved' as const,
        store,
      })),
      new Promise<{ status: 'timeout' }>((resolve) => {
        setTimeout(() => resolve({ status: 'timeout' }), 25);
      }),
    ]);

    expect(resolved.status).toBe('resolved');
    if (resolved.status === 'resolved') {
      expect(resolved.store.locale).toBe('de');
      expect(resolved.store.entries.length).toBeGreaterThan(staleStore.entries.length);
    }
  });
});
