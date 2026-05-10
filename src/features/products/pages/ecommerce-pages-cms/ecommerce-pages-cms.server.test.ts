import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  fsMkdir: vi.fn(async () => undefined),
  fsWriteFile: vi.fn(async () => undefined),
  getDiskPathFromPublicPath: vi.fn(),
  getMongoDb: vi.fn(),
  mongoClientClose: vi.fn(async () => undefined),
  mongoClientConnect: vi.fn(async () => undefined),
  mongoClientCtor: vi.fn(),
  mongoClientDb: vi.fn(),
  resolveMongoSourceConfig: vi.fn(),
  resolveEcommerceMongoSourceConfig: vi.fn(),
  uploadBufferToFastComet: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: mocks.fsMkdir,
      writeFile: mocks.fsWriteFile,
    },
  },
  promises: {
    mkdir: mocks.fsMkdir,
    writeFile: mocks.fsWriteFile,
  },
}));

vi.mock('mongodb', () => ({
  MongoClient: vi.fn(function MongoClient(uri: string, options: Record<string, unknown>) {
    mocks.mongoClientCtor(uri, options);
    return {
      close: mocks.mongoClientClose,
      connect: mocks.mongoClientConnect,
      db: mocks.mongoClientDb,
    };
  }),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

vi.mock('@/shared/lib/db/mongo-source', () => ({
  resolveMongoSourceConfig: mocks.resolveMongoSourceConfig,
}));

vi.mock('@/shared/lib/db/utils/mongo', () => ({
  resolveEcommerceMongoSourceConfig: mocks.resolveEcommerceMongoSourceConfig,
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  getDiskPathFromPublicPath: mocks.getDiskPathFromPublicPath,
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  uploadBufferToFastComet: mocks.uploadBufferToFastComet,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

import {
  readEcommercePagesCmsCollectionCards,
  readEcommercePagesCmsLogo,
  saveEcommercePagesCmsCollectionCards,
  uploadEcommercePagesCmsCollectionCardImage,
  uploadEcommercePagesCmsLogo,
} from './ecommerce-pages-cms.server';

type CmsPageDoc = {
  content?: Record<string, unknown>;
  createdAt?: Date;
  locale: string;
  page: string;
  updatedAt?: Date;
  updatedBy?: string;
};

type CmsPageFilter = Partial<Pick<CmsPageDoc, 'locale' | 'page'>>;

type CmsPageUpdate = {
  $set?: Record<string, unknown>;
  $setOnInsert?: Partial<CmsPageDoc>;
};

type FakeCollection = ReturnType<typeof createFakeCollection>;

const matchesFilter = (doc: CmsPageDoc, filter: CmsPageFilter): boolean =>
  Object.entries(filter).every(([key, value]) => doc[key as keyof CmsPageFilter] === value);

const setByPath = (target: Record<string, unknown>, dottedPath: string, value: unknown): void => {
  const segments = dottedPath.split('.');
  const finalSegment = segments.pop();
  if (finalSegment === undefined) return;

  let cursor = target;
  segments.forEach((segment) => {
    const current = cursor[segment];
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  });
  cursor[finalSegment] = value;
};

const applySet = (doc: CmsPageDoc, set: Record<string, unknown> | undefined): void => {
  if (set === undefined) return;
  Object.entries(set).forEach(([key, value]) => {
    if (key.includes('.')) {
      setByPath(doc as Record<string, unknown>, key, value);
      return;
    }
    (doc as Record<string, unknown>)[key] = value;
  });
};

function createFakeCollection(initialDocs: CmsPageDoc[] = []) {
  const docs = initialDocs.map((doc) => ({ ...doc }));
  return {
    createIndex: vi.fn(async () => 'page_1_locale_1'),
    docs,
    find: vi.fn((filter: CmsPageFilter) => ({
      toArray: vi.fn(async () => docs.filter((doc) => matchesFilter(doc, filter))),
    })),
    findOne: vi.fn(async (filter: CmsPageFilter) =>
      docs.find((doc) => matchesFilter(doc, filter)) ?? null
    ),
    updateMany: vi.fn(async (filter: CmsPageFilter, update: CmsPageUpdate) => {
      const matchedDocs = docs.filter((doc) => matchesFilter(doc, filter));
      matchedDocs.forEach((doc) => applySet(doc, update.$set));
      return { matchedCount: matchedDocs.length, modifiedCount: matchedDocs.length };
    }),
    updateOne: vi.fn(async (filter: CmsPageFilter, update: CmsPageUpdate, options = {}) => {
      const existingDoc = docs.find((doc) => matchesFilter(doc, filter));
      if (existingDoc !== undefined) {
        applySet(existingDoc, update.$set);
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      }

      const canUpsert = typeof options === 'object' && options !== null && 'upsert' in options;
      if (canUpsert && (options as { upsert?: boolean }).upsert === true) {
        const inserted: CmsPageDoc = {
          ...(filter as Pick<CmsPageDoc, 'locale' | 'page'>),
          ...(update.$setOnInsert ?? {}),
        };
        applySet(inserted, update.$set);
        docs.push(inserted);
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }

      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }),
  };
}

const createFakeDb = (collection: FakeCollection) => ({
  collection: vi.fn(() => collection),
});

describe('ecommerce pages CMS server service', () => {
  let appLocalCollection: FakeCollection;
  let appCloudCollection: FakeCollection;
  let ecommerceLocalCollection: FakeCollection;
  let cloudCollection: FakeCollection;

  beforeEach(() => {
    vi.clearAllMocks();
    appLocalCollection = createFakeCollection();
    appCloudCollection = createFakeCollection();
    ecommerceLocalCollection = createFakeCollection();
    cloudCollection = createFakeCollection();

    mocks.getMongoDb.mockResolvedValue(createFakeDb(appLocalCollection));
    mocks.mongoClientConnect.mockResolvedValue(undefined);
    mocks.mongoClientClose.mockResolvedValue(undefined);
    mocks.mongoClientDb.mockImplementation((dbName: string) =>
      createFakeDb(
        dbName === 'app_cloud'
          ? appCloudCollection
          : dbName === 'ecom_local'
            ? ecommerceLocalCollection
            : cloudCollection
      )
    );
    mocks.getDiskPathFromPublicPath.mockImplementation(
      (publicPath: string) => `/tmp/geminitestapp${publicPath}`
    );
    mocks.resolveEcommerceMongoSourceConfig.mockImplementation((source: string) => ({
      configured: true,
      dbName: source === 'local' ? 'ecom_local' : 'ecom_cloud',
      source,
      uri:
        source === 'local'
          ? 'mongodb://127.0.0.1:27021/ecom_local'
          : 'mongodb+srv://cluster.example/ecom_cloud',
      usesLegacyEnv: false,
    }));
    mocks.resolveMongoSourceConfig.mockResolvedValue({
      configured: true,
      dbName: 'app_cloud',
      source: 'cloud',
      uri: 'mongodb+srv://cluster.example/app_cloud',
      usesLegacyEnv: false,
    });
    mocks.uploadBufferToFastComet.mockResolvedValue(
      'https://sparksofsindri.com/uploads/cms/stargater/logo/logo.png'
    );
  });

  it('writes a logo locally and mirrors CMS fields to ecommerce and runtime databases', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'Main Logo.PNG', {
      type: 'image/png',
    });

    const result = await uploadEcommercePagesCmsLogo({
      file,
      logoAlt: 'Store mark',
      userId: 'admin-1',
    });

    expect(result.localPublicPath).toMatch(/^\/uploads\/cms\/stargater\/logo\/.+-main-logo\.png$/);
    expect(result.logoUrl).toBe('https://sparksofsindri.com/uploads/cms/stargater/logo/logo.png');
    expect(result.cloudMirrored).toBe(true);

    expect(mocks.fsMkdir).toHaveBeenCalledWith(
      expect.stringMatching(/\/tmp\/geminitestapp\/uploads\/cms\/stargater\/logo$/),
      { recursive: true }
    );
    expect(mocks.fsWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/tmp\/geminitestapp\/uploads\/cms\/stargater\/logo\/.+-main-logo\.png$/),
      expect.any(Buffer)
    );
    expect(mocks.uploadBufferToFastComet).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'cms',
        folder: 'stargater/logo',
        mimetype: 'image/png',
        publicPath: result.localPublicPath,
      })
    );

    expect(appLocalCollection.docs[0]).toMatchObject({
      content: { nav: { logoAlt: 'Store mark', logoUrl: result.logoUrl } },
      locale: 'en',
      page: 'site',
      updatedBy: 'admin-1',
    });
    expect(ecommerceLocalCollection.docs[0]).toMatchObject({
      content: { nav: { logoAlt: 'Store mark', logoUrl: result.logoUrl } },
      locale: 'en',
      page: 'site',
      updatedBy: 'admin-1',
    });
    expect(cloudCollection.docs[0]).toMatchObject({
      content: { nav: { logoAlt: 'Store mark', logoUrl: result.logoUrl } },
      locale: 'en',
      page: 'site',
      updatedBy: 'admin-1',
    });
    expect(appCloudCollection.docs[0]).toMatchObject({
      content: { nav: { logoAlt: 'Store mark', logoUrl: result.logoUrl } },
      locale: 'en',
      page: 'site',
      updatedBy: 'admin-1',
    });
    expect(mocks.mongoClientCtor).toHaveBeenCalledWith(
      'mongodb://127.0.0.1:27021/ecom_local',
      expect.objectContaining({ directConnection: true, serverSelectionTimeoutMS: 5000 })
    );
    expect(mocks.mongoClientCtor).toHaveBeenCalledWith(
      'mongodb+srv://cluster.example/ecom_cloud',
      expect.objectContaining({ serverSelectionTimeoutMS: 5000 })
    );
    expect(mocks.mongoClientCtor).toHaveBeenCalledWith(
      'mongodb+srv://cluster.example/app_cloud',
      expect.objectContaining({ serverSelectionTimeoutMS: 5000 })
    );
    expect(mocks.mongoClientClose).toHaveBeenCalledTimes(3);
  });

  it('reads the local site logo snapshot and reports whether cloud mirroring is configured', async () => {
    appLocalCollection = createFakeCollection([
      {
        content: {
          nav: {
            logoAlt: 'Existing logo',
            logoUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/existing.webp',
          },
        },
        locale: 'en',
        page: 'site',
        updatedAt: new Date('2026-05-10T12:00:00.000Z'),
        updatedBy: 'admin-1',
      },
    ]);
    mocks.getMongoDb.mockResolvedValue(createFakeDb(appLocalCollection));

    const snapshot = await readEcommercePagesCmsLogo();

    expect(snapshot).toEqual({
      cloudConfigured: true,
      logoAlt: 'Existing logo',
      logoUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/existing.webp',
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'admin-1',
    });
    expect(mocks.mongoClientCtor).not.toHaveBeenCalled();
  });

  it('writes a collection card image locally and uploads it to the FastComet card folder', async () => {
    mocks.uploadBufferToFastComet.mockResolvedValueOnce(
      'https://sparksofsindri.com/uploads/cms/stargater/collection-cards/anime.webp'
    );
    const file = new File([new Uint8Array([4, 5, 6])], 'Anime Card.webp', {
      type: 'image/webp',
    });

    const result = await uploadEcommercePagesCmsCollectionCardImage({ file });

    expect(result.localPublicPath).toMatch(
      /^\/uploads\/cms\/stargater\/collection-cards\/.+-anime-card\.webp$/
    );
    expect(result.remoteUrl).toBe(
      'https://sparksofsindri.com/uploads/cms/stargater/collection-cards/anime.webp'
    );
    expect(result.mimetype).toBe('image/webp');

    expect(mocks.fsMkdir).toHaveBeenCalledWith(
      expect.stringMatching(/\/tmp\/geminitestapp\/uploads\/cms\/stargater\/collection-cards$/),
      { recursive: true }
    );
    expect(mocks.fsWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/tmp\/geminitestapp\/uploads\/cms\/stargater\/collection-cards\/.+-anime-card\.webp$/
      ),
      expect.any(Buffer)
    );
    expect(mocks.uploadBufferToFastComet).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'cms',
        folder: 'stargater/collection-cards',
        mimetype: 'image/webp',
        publicPath: result.localPublicPath,
      })
    );
    expect(mocks.getMongoDb).not.toHaveBeenCalled();
  });

  it('saves collection cards locally and mirrors them to ecommerce and runtime databases', async () => {
    const cards = [
      {
        id: 'anime',
        label: 'Anime',
        sublabel: 'Pins · Keychains',
        tag: 'Universe',
        visible: false,
        href: '/products?categories=Anime%20Ring',
        imageUrl: 'https://sparksofsindri.com/uploads/cms/stargater/collection-cards/anime.webp',
        selectorType: 'category' as const,
        selectorValues: ['Anime Ring'],
        fallbackCount: 42,
      },
    ];

    const result = await saveEcommercePagesCmsCollectionCards({
      cards,
      userId: 'admin-2',
    });

    expect(result.cloudMirrored).toBe(true);
    expect(result.cards[0]).toMatchObject({
      id: 'anime',
      imageUrl: cards[0].imageUrl,
      selectorValues: ['Anime Ring'],
      visible: false,
    });

    [appLocalCollection, ecommerceLocalCollection, cloudCollection, appCloudCollection].forEach(
      (collection) => {
        expect(collection.docs[0]).toMatchObject({
          content: {
            categories: {
              cards: [
                expect.objectContaining({
                  id: 'anime',
                  imageUrl: cards[0].imageUrl,
                  selectorType: 'category',
                  selectorValues: ['Anime Ring'],
                  visible: false,
                }),
              ],
            },
          },
          locale: 'en',
          page: 'home',
          updatedBy: 'admin-2',
        });
      }
    );
    expect(mocks.mongoClientClose).toHaveBeenCalledTimes(3);
  });

  it('reads saved collection cards from the local home CMS page', async () => {
    appLocalCollection = createFakeCollection([
      {
        content: {
          categories: {
            cards: [
              {
                id: 'gaming',
                label: 'Gaming',
                sublabel: 'RPG · Strategy',
                tag: 'Hot Drops',
                visible: true,
                href: '/products?themes=Elden%20Ring',
                imageUrl:
                  'https://sparksofsindri.com/uploads/cms/stargater/collection-cards/gaming.webp',
                selectorType: 'theme',
                selectorValues: ['Elden Ring'],
                fallbackCount: 17,
              },
            ],
          },
        },
        locale: 'en',
        page: 'home',
        updatedAt: new Date('2026-05-10T12:30:00.000Z'),
        updatedBy: 'admin-2',
      },
    ]);
    mocks.getMongoDb.mockResolvedValue(createFakeDb(appLocalCollection));

    const snapshot = await readEcommercePagesCmsCollectionCards();

    expect(snapshot).toEqual({
      cards: [
        expect.objectContaining({
          id: 'gaming',
          imageUrl:
            'https://sparksofsindri.com/uploads/cms/stargater/collection-cards/gaming.webp',
          selectorType: 'theme',
          selectorValues: ['Elden Ring'],
          visible: true,
        }),
      ],
      cloudConfigured: true,
      updatedAt: '2026-05-10T12:30:00.000Z',
      updatedBy: 'admin-2',
    });
    expect(mocks.mongoClientCtor).not.toHaveBeenCalled();
  });

  it('surfaces cloud mirror failures after the local save succeeds', async () => {
    mocks.mongoClientConnect
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('cloud unavailable'));
    const file = new File([new Uint8Array([1])], 'logo.webp', { type: 'image/webp' });

    await expect(
      uploadEcommercePagesCmsLogo({
        file,
        logoAlt: 'Local only',
        userId: 'admin-1',
      })
    ).rejects.toThrow('could not be mirrored to the ecommerce databases');

    expect(appLocalCollection.docs[0]).toMatchObject({
      content: {
        nav: {
          logoAlt: 'Local only',
          logoUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/logo.png',
        },
      },
      locale: 'en',
      page: 'site',
    });
    expect(ecommerceLocalCollection.docs[0]).toMatchObject({
      content: {
        nav: {
          logoAlt: 'Local only',
          logoUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/logo.png',
        },
      },
      locale: 'en',
      page: 'site',
    });
    expect(cloudCollection.docs).toEqual([]);
    expect(appCloudCollection.docs).toEqual([]);
    expect(mocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'mirrorLogoToEcommerceDatabases' })
    );
  });
});
