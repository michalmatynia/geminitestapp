import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
