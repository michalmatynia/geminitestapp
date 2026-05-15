import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  mongoClientClose: vi.fn(async () => undefined),
  mongoClientConnect: vi.fn(async () => undefined),
  mongoClientCtor: vi.fn(),
  mongoClientDb: vi.fn(),
  resolveArchMongoSourceConfig: vi.fn(),
  resolveMongoSourceConfig: vi.fn(),
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

vi.mock('@/shared/lib/db/mongo-source', () => ({
  resolveMongoSourceConfig: mocks.resolveMongoSourceConfig,
}));

vi.mock('@/shared/lib/db/utils/mongo', () => ({
  resolveArchMongoSourceConfig: mocks.resolveArchMongoSourceConfig,
}));

import {
  DEFAULT_MILKBAR_LOCALIZED_CONTENT,
  DEFAULT_MILKBAR_PAGE_CONTENT,
  DEFAULT_MILKBAR_PAGE_SETTINGS,
  type MilkbarCmsUpdateInput,
} from './milkbar-cms.types';
import {
  getMilkbarDesignersCmsSnapshot,
  patchMilkbarInquiryStatus,
  saveMilkbarDesignersCmsSnapshot,
} from './milkbar-cms.server';

type FakeDoc = Record<string, unknown>;
type FakeFilter = Record<string, unknown>;
type FakeUpdate = {
  $set?: FakeDoc;
  $setOnInsert?: FakeDoc;
};

const matchesFilter = (doc: FakeDoc, filter: FakeFilter): boolean =>
  Object.entries(filter).every(([key, value]) => doc[key] === value);

function createFakeCollection(initialDocs: FakeDoc[] = []) {
  const docs = initialDocs.map((doc) => ({ ...doc }));
  return {
    createIndex: vi.fn(async () => 'ok'),
    deleteMany: vi.fn(async (filter: FakeFilter) => {
      if (Object.keys(filter).length === 0) {
        docs.splice(0, docs.length);
        return { deletedCount: docs.length };
      }
      const codeFilter = filter['code'];
      const keptCodes =
        typeof codeFilter === 'object' && codeFilter !== null && '$nin' in codeFilter
          ? ((codeFilter as { $nin: string[] }).$nin)
          : [];
      const before = docs.length;
      for (let index = docs.length - 1; index >= 0; index -= 1) {
        const code = docs[index]?.['code'];
        if (typeof code === 'string' && !keptCodes.includes(code)) {
          docs.splice(index, 1);
        }
      }
      return { deletedCount: before - docs.length };
    }),
    docs,
    find: vi.fn((filter: FakeFilter = {}) => {
      let limitCount: number | null = null;
      const cursor = {
        limit: vi.fn((nextLimit: number) => {
          limitCount = nextLimit;
          return cursor;
        }),
        sort: vi.fn(() => cursor),
        toArray: vi.fn(async () => {
          const results = docs.filter((doc) => matchesFilter(doc, filter));
          return limitCount === null ? results : results.slice(0, limitCount);
        }),
      };
      return cursor;
    }),
    findOne: vi.fn(async (filter: FakeFilter) => docs.find((doc) => matchesFilter(doc, filter)) ?? null),
    updateOne: vi.fn(async (filter: FakeFilter, update: FakeUpdate, options?: { upsert?: boolean }) => {
      let doc = docs.find((entry) => matchesFilter(entry, filter));
      if (doc === undefined && options?.upsert === true) {
        doc = { ...filter, ...(update.$setOnInsert ?? {}) };
        docs.push(doc);
      }
      if (doc !== undefined && update.$set !== undefined) {
        Object.assign(doc, update.$set);
      }
      return { matchedCount: doc === undefined ? 0 : 1, upsertedCount: doc === undefined ? 0 : 1 };
    }),
  };
}

type FakeDb = ReturnType<typeof createFakeDb>;

function createFakeDb(initialCollections: Record<string, FakeDoc[]> = {}) {
  const collections = new Map(
    Object.entries(initialCollections).map(([name, docs]) => [name, createFakeCollection(docs)])
  );
  return {
    collection: vi.fn((name: string) => {
      const existing = collections.get(name);
      if (existing !== undefined) return existing;
      const collection = createFakeCollection();
      collections.set(name, collection);
      return collection;
    }),
    collections,
  };
}

describe('milkbar cms server', () => {
  let sourceDb: FakeDb;
  let runtimeDb: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    sourceDb = createFakeDb();
    runtimeDb = createFakeDb();
    mocks.resolveMongoSourceConfig.mockResolvedValue({
      configured: true,
      dbName: 'app_local',
      source: 'local',
      uri: 'mongodb://127.0.0.1:27017/app_local',
      usesLegacyEnv: false,
    });
    mocks.resolveArchMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') => ({
      configured: source === 'local',
      dbName: source === 'local' ? 'arch_web_local' : null,
      source,
      uri: source === 'local' ? 'mongodb://127.0.0.1:27022/arch_web_local' : null,
      usesLegacyEnv: false,
    }));
    mocks.mongoClientDb.mockImplementation((dbName: string) =>
      dbName === 'app_local' ? sourceDb : runtimeDb
    );
  });

  it('saves localized Milkbar CMS data to GeminiTest source collections and mirrors runtime collections', async () => {
    const payload: MilkbarCmsUpdateInput = {
      localizedContent: {
        ...DEFAULT_MILKBAR_LOCALIZED_CONTENT,
        en: {
          ...DEFAULT_MILKBAR_PAGE_CONTENT,
          hero: {
            ...DEFAULT_MILKBAR_PAGE_CONTENT.hero,
            lede: 'Source-controlled Milkbar content.',
          },
        },
      },
      pageSettings: DEFAULT_MILKBAR_PAGE_SETTINGS,
      projects: [
        {
          cameraPosition: { x: 1, y: 2, z: 3 },
          cameraTarget: { x: 0, y: 1, z: 0 },
          city: 'Amsterdam',
          code: 'MBD-001',
          country: 'NL',
          description: 'A test project.',
          name: 'Source Project',
          order: 1,
          projectType: 'Architecture Project',
          stats: ['120 sqm'],
          status: 'published',
        },
      ],
      services: [
        {
          code: 'S-01',
          description: 'A test service.',
          order: 1,
          title: 'Source Service',
        },
      ],
    };

    const snapshot = await saveMilkbarDesignersCmsSnapshot(payload);

    expect(snapshot).toMatchObject({
      contentSource: 'sourceOfTruth',
      counts: {
        runtimeLocal: { inquiries: 0, projects: 1, services: 1 },
        sourceOfTruth: { projects: 1, services: 1 },
      },
      localizedContent: {
        en: { hero: { lede: 'Source-controlled Milkbar content.' } },
      },
    });
    expect(sourceDb.collection('milkbar_page_content').docs[0]).toMatchObject({
      localizedContent: payload.localizedContent,
      key: 'home',
    });
    expect(sourceDb.collection('milkbar_projects').docs[0]).toMatchObject({
      code: 'MBD-001',
      name: 'Source Project',
    });
    expect(runtimeDb.collection('page_content').docs[0]).toMatchObject({
      localizedContent: payload.localizedContent,
      key: 'home',
    });
    expect(runtimeDb.collection('projects').docs[0]).toMatchObject({
      code: 'MBD-001',
      name: 'Source Project',
    });
  });

  it('accepts legacy pageContent field (pre-localization) and promotes it to EN locale', async () => {
    const legacyPayload = {
      pageContent: {
        ...DEFAULT_MILKBAR_PAGE_CONTENT,
        hero: { ...DEFAULT_MILKBAR_PAGE_CONTENT.hero, lede: 'Legacy EN content.' },
      },
      projects: [],
      services: [],
    };

    const snapshot = await saveMilkbarDesignersCmsSnapshot(legacyPayload);

    expect(snapshot.localizedContent.en.hero.lede).toBe('Legacy EN content.');
    expect(snapshot.contentSource).toBe('sourceOfTruth');
  });

  it('uses runtime data as a bootstrap fallback when source-of-truth collections are empty', async () => {
    runtimeDb = createFakeDb({
      page_content: [
        {
          localizedContent: {
            en: { hero: { lede: 'Runtime bootstrap content.' } },
            de: {},
            pl: {},
          },
          key: 'home',
          updatedAt: new Date('2026-05-15T10:30:00.000Z'),
        },
      ],
      projects: [
        {
          cameraPosition: { x: 1, y: 2, z: 3 },
          cameraTarget: { x: 0, y: 1, z: 0 },
          city: 'Amsterdam',
          code: 'MBD-002',
          country: 'NL',
          description: 'Runtime project.',
          name: 'Runtime Project',
          order: 2,
          projectType: 'Architecture Project',
          stats: [],
          status: 'published',
        },
      ],
    });

    const snapshot = await getMilkbarDesignersCmsSnapshot();

    expect(snapshot.contentSource).toBe('runtimeFallback');
    expect(snapshot.localizedContent.en.hero.lede).toBe('Runtime bootstrap content.');
    expect(snapshot.projects).toHaveLength(1);
    expect(snapshot.counts.sourceOfTruth.projects).toBe(0);
    expect(snapshot.counts.runtimeLocal.projects).toBe(1);
  });

  it('migrates legacy runtime content field to EN locale automatically on read', async () => {
    runtimeDb = createFakeDb({
      page_content: [
        {
          content: { hero: { lede: 'Legacy runtime content.' } },
          key: 'home',
          updatedAt: new Date('2026-05-15T10:30:00.000Z'),
        },
      ],
    });

    const snapshot = await getMilkbarDesignersCmsSnapshot();

    expect(snapshot.contentSource).toBe('runtimeFallback');
    expect(snapshot.localizedContent.en.hero.lede).toBe('Legacy runtime content.');
  });

  it('prefers source-of-truth content over stale runtime content', async () => {
    sourceDb = createFakeDb({
      milkbar_page_content: [
        {
          localizedContent: {
            en: { hero: { lede: 'Source wins.' } },
            de: {},
            pl: {},
          },
          key: 'home',
          updatedAt: new Date('2026-05-15T12:30:00.000Z'),
        },
      ],
    });
    runtimeDb = createFakeDb({
      page_content: [
        {
          localizedContent: {
            en: { hero: { lede: 'Runtime stale.' } },
            de: {},
            pl: {},
          },
          key: 'home',
          updatedAt: new Date('2026-05-14T12:30:00.000Z'),
        },
      ],
    });

    const snapshot = await getMilkbarDesignersCmsSnapshot();

    expect(snapshot.contentSource).toBe('sourceOfTruth');
    expect(snapshot.localizedContent.en.hero.lede).toBe('Source wins.');
    expect(snapshot.updatedAt).toBe('2026-05-15T12:30:00.000Z');
  });

  it('prunes projects and services removed from the CMS payload in both databases', async () => {
    sourceDb = createFakeDb({
      milkbar_projects: [
        { code: 'MBD-001', name: 'Keep' },
        { code: 'MBD-OLD', name: 'Remove' },
      ],
      milkbar_services: [
        { code: 'S-01', title: 'Keep' },
        { code: 'S-OLD', title: 'Remove' },
      ],
    });
    runtimeDb = createFakeDb({
      projects: [
        { code: 'MBD-001', name: 'Keep' },
        { code: 'MBD-OLD', name: 'Remove' },
      ],
      services: [
        { code: 'S-01', title: 'Keep' },
        { code: 'S-OLD', title: 'Remove' },
      ],
    });

    await saveMilkbarDesignersCmsSnapshot({
      localizedContent: DEFAULT_MILKBAR_LOCALIZED_CONTENT,
      pageSettings: DEFAULT_MILKBAR_PAGE_SETTINGS,
      projects: [
        {
          cameraPosition: { x: 1, y: 2, z: 3 },
          cameraTarget: { x: 0, y: 1, z: 0 },
          city: 'Amsterdam',
          code: 'MBD-001',
          country: 'NL',
          description: 'Kept project.',
          name: 'Keep',
          order: 1,
          projectType: 'Architecture Project',
          stats: [],
          status: 'published',
        },
      ],
      services: [
        {
          code: 'S-01',
          description: 'Kept service.',
          order: 1,
          title: 'Keep',
        },
      ],
    });

    expect(sourceDb.collection('milkbar_projects').docs).toHaveLength(1);
    expect(sourceDb.collection('milkbar_projects').docs[0]?.['code']).toBe('MBD-001');
    expect(sourceDb.collection('milkbar_services').docs).toHaveLength(1);
    expect(sourceDb.collection('milkbar_services').docs[0]?.['code']).toBe('S-01');
    expect(runtimeDb.collection('projects').docs).toHaveLength(1);
    expect(runtimeDb.collection('projects').docs[0]?.['code']).toBe('MBD-001');
    expect(runtimeDb.collection('services').docs).toHaveLength(1);
    expect(runtimeDb.collection('services').docs[0]?.['code']).toBe('S-01');
  });

  it('normalizes caseStudy visibility flag correctly', async () => {
    const snapshot = await saveMilkbarDesignersCmsSnapshot({
      localizedContent: DEFAULT_MILKBAR_LOCALIZED_CONTENT,
      pageSettings: {
        ...DEFAULT_MILKBAR_PAGE_SETTINGS,
        visibility: { ...DEFAULT_MILKBAR_PAGE_SETTINGS.visibility, caseStudy: false },
      },
      projects: [],
      services: [],
    });

    expect(snapshot.pageSettings.visibility.caseStudy).toBe(false);
    // All other flags should remain at their defaults
    expect(snapshot.pageSettings.visibility.projects).toBe(true);
    expect(snapshot.pageSettings.visibility.metrics).toBe(true);
  });

  it('saves and reads pageSettings including section visibility and SEO metadata', async () => {
    const customSettings = {
      ...DEFAULT_MILKBAR_PAGE_SETTINGS,
      visibility: { ...DEFAULT_MILKBAR_PAGE_SETTINGS.visibility, quote: false, metrics: false },
      defaultLocale: 'de' as const,
      publishedLocales: ['en', 'de'] as const,
      seo: {
        ...DEFAULT_MILKBAR_PAGE_SETTINGS.seo,
        en: { title: 'Custom EN title', description: 'Custom EN desc', ogTitle: 'OG EN', ogDescription: 'OG EN desc' },
      },
    };

    const snapshot = await saveMilkbarDesignersCmsSnapshot({
      localizedContent: DEFAULT_MILKBAR_LOCALIZED_CONTENT,
      pageSettings: customSettings,
      projects: [],
      services: [],
    });

    expect(snapshot.pageSettings.visibility.quote).toBe(false);
    expect(snapshot.pageSettings.visibility.metrics).toBe(false);
    expect(snapshot.pageSettings.defaultLocale).toBe('de');
    expect(snapshot.pageSettings.publishedLocales).toContain('en');
    expect(snapshot.pageSettings.publishedLocales).toContain('de');
    expect(snapshot.pageSettings.seo.en.title).toBe('Custom EN title');
  });

  it('preserves the locale field on inquiry records and omits it when absent', async () => {
    runtimeDb = createFakeDb({
      inquiries: [
        { email: 'de@example.com', createdAt: new Date('2026-05-15T10:00:00.000Z'), status: 'pending', source: 'cta-form', locale: 'de' },
        { email: 'no-locale@example.com', createdAt: new Date('2026-05-15T09:00:00.000Z'), status: 'pending', source: 'cta-form' },
      ],
    });

    const snapshot = await getMilkbarDesignersCmsSnapshot();

    const deInquiry = snapshot.inquiries.find((i) => i.email === 'de@example.com');
    const noLocaleInquiry = snapshot.inquiries.find((i) => i.email === 'no-locale@example.com');

    expect(deInquiry?.locale).toBe('de');
    expect(noLocaleInquiry).toBeDefined();
    expect('locale' in (noLocaleInquiry ?? {})).toBe(false);
  });

  it('patchMilkbarInquiryStatus updates the status of an inquiry in the runtime DB', async () => {
    runtimeDb = createFakeDb({
      inquiries: [
        { email: 'leads@example.com', createdAt: new Date('2026-05-15T10:00:00.000Z'), status: 'pending', source: 'cta-form' },
      ],
    });

    const result = await patchMilkbarInquiryStatus('leads@example.com', 'contacted');

    expect(result.ok).toBe(true);
    const inquiry = runtimeDb.collection('inquiries').docs.find((d) => d['email'] === 'leads@example.com');
    expect(inquiry?.['status']).toBe('contacted');
  });

  it('normalizes footer column links from saved page content', async () => {
    const contentWithFooter = {
      ...DEFAULT_MILKBAR_PAGE_CONTENT,
      footer: {
        ...DEFAULT_MILKBAR_PAGE_CONTENT.footer,
        columns: [
          {
            title: 'Services',
            links: [
              { label: 'Compliance', href: '/compliance' },
              { label: 'Massing', href: '/massing' },
            ],
          },
        ],
      },
    };

    const snapshot = await saveMilkbarDesignersCmsSnapshot({
      localizedContent: { ...DEFAULT_MILKBAR_LOCALIZED_CONTENT, en: contentWithFooter },
      pageSettings: DEFAULT_MILKBAR_PAGE_SETTINGS,
      projects: [],
      services: [],
    });

    const col = snapshot.localizedContent.en.footer.columns[0];
    expect(col?.title).toBe('Services');
    expect(col?.links).toHaveLength(2);
    expect(col?.links[0]).toEqual({ label: 'Compliance', href: '/compliance' });
    expect(col?.links[1]).toEqual({ label: 'Massing', href: '/massing' });
  });

  it('normalizes nav content including links and ctaLabel across locales', async () => {
    const deContent = {
      ...DEFAULT_MILKBAR_PAGE_CONTENT,
      nav: {
        brandSub: '/ gegr. Amsterdam',
        links: [
          { label: 'Praxis', href: '#practice' },
          { label: 'Projekte', href: '#projects' },
        ],
        ctaLabel: 'Anfragen',
      },
    };

    const snapshot = await saveMilkbarDesignersCmsSnapshot({
      localizedContent: { ...DEFAULT_MILKBAR_LOCALIZED_CONTENT, de: deContent },
      pageSettings: DEFAULT_MILKBAR_PAGE_SETTINGS,
      projects: [],
      services: [],
    });

    const de = snapshot.localizedContent.de;
    expect(de.nav.brandSub).toBe('/ gegr. Amsterdam');
    expect(de.nav.ctaLabel).toBe('Anfragen');
    expect(de.nav.links).toHaveLength(2);
    expect(de.nav.links[0]).toEqual({ label: 'Praxis', href: '#practice' });
    expect(de.nav.links[1]).toEqual({ label: 'Projekte', href: '#projects' });

    // EN nav should be untouched
    const en = snapshot.localizedContent.en;
    expect(en.nav.ctaLabel).toBe(DEFAULT_MILKBAR_PAGE_CONTENT.nav.ctaLabel);
  });
});
