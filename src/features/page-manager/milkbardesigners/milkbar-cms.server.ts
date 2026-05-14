import 'server-only';

import { MongoClient } from 'mongodb';

import {
  DEFAULT_MILKBAR_PAGE_CONTENT,
  type MilkbarCmsSnapshot,
  type MilkbarCmsUpdateInput,
  type MilkbarFooterColumn,
  type MilkbarInquiryCmsRecord,
  type MilkbarMetric,
  type MilkbarPageContent,
  type MilkbarPrinciple,
  type MilkbarProcessStep,
  type MilkbarProjectCmsRecord,
  type MilkbarServiceCmsRecord,
} from './milkbar-cms.types';
import { configurationError, badRequestError } from '@/shared/errors/app-error';
import {
  resolveArchMongoSourceConfig,
  type MongoApplicationSourceConfig,
} from '@/shared/lib/db/utils/mongo';

const PAGE_CONTENT_COLLECTION = 'page_content';
const PAGE_CONTENT_KEY = 'home';

type AnyRecord = Record<string, unknown>;
type Vector = { x: number; y: number; z: number };

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return next.length > 0 ? next : fallback;
};

const splitMultiline = (value: string): string[] =>
  value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

const redactMongoUri = (value: string | null): string | null => {
  if (value === null) return null;
  return value.replace(/(mongodb(?:\+srv)?:\/\/)([^@/\s]+)@/g, (_match, prefix: string, auth: string) => {
    const [username] = auth.split(':');
    return `${prefix}${username || '***'}:***@`;
  });
};

const getMongoClientOptions = (uri: string): ConstructorParameters<typeof MongoClient>[1] => ({
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  ...(uri.includes('127.0.0.1') || uri.includes('localhost') ? { directConnection: true } : {}),
});

const assertConfigured = (
  config: MongoApplicationSourceConfig
): MongoApplicationSourceConfig & { uri: string; dbName: string } => {
  if (!config.configured || !config.uri || !config.dbName) {
    throw configurationError('Milkbar local MongoDB is not configured.');
  }
  return config as MongoApplicationSourceConfig & { uri: string; dbName: string };
};

async function withArchDb<T>(work: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
  const config = assertConfigured(resolveArchMongoSourceConfig('local'));
  const client = new MongoClient(config.uri, getMongoClientOptions(config.uri));
  try {
    await client.connect();
    return await work(client.db(config.dbName));
  } finally {
    await client.close();
  }
}

const normalizePrinciples = (value: unknown): MilkbarPrinciple[] => {
  const fallback = DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.principles;
  if (!Array.isArray(value)) return fallback;
  const next = value.map((entry, index) => {
    const record = isRecord(entry) ? entry : {};
    const current = fallback[index] ?? fallback[0];
    return {
      number: asString(record['number'], current.number),
      title: asString(record['title'], current.title),
      emphasis: asString(record['emphasis'], current.emphasis),
      description: asString(record['description'], current.description),
    };
  });
  return next.length > 0 ? next : fallback;
};

const normalizeProcessSteps = (value: unknown): MilkbarProcessStep[] => {
  const fallback = DEFAULT_MILKBAR_PAGE_CONTENT.process.steps;
  if (!Array.isArray(value)) return fallback;
  const next = value.map((entry, index) => {
    const record = isRecord(entry) ? entry : {};
    const current = fallback[index] ?? fallback[0];
    return {
      number: asString(record['number'], current.number),
      title: asString(record['title'], current.title),
      description: asString(record['description'], current.description),
    };
  });
  return next.length > 0 ? next : fallback;
};

const normalizeMetrics = (value: unknown): MilkbarMetric[] => {
  const fallback = DEFAULT_MILKBAR_PAGE_CONTENT.metrics;
  if (!Array.isArray(value)) return fallback;
  const next = value.map((entry, index) => {
    const record = isRecord(entry) ? entry : {};
    const current = fallback[index] ?? fallback[0];
    return {
      value: asString(record['value'], current.value),
      suffix: typeof record['suffix'] === 'string' ? record['suffix'].trim() : current.suffix,
      label: asString(record['label'], current.label),
    };
  });
  return next.length > 0 ? next : fallback;
};

const normalizeFooterColumns = (value: unknown): MilkbarFooterColumn[] => {
  const fallback = DEFAULT_MILKBAR_PAGE_CONTENT.footer.columns;
  if (!Array.isArray(value)) return fallback;
  const next = value.map((entry, index) => {
    const record = isRecord(entry) ? entry : {};
    const current = fallback[index] ?? fallback[0];
    const rawLinks = Array.isArray(record['links']) ? record['links'] : current.links;
    return {
      title: asString(record['title'], current.title),
      links: rawLinks.map((link, linkIndex) => {
        const linkRecord = isRecord(link) ? link : {};
        const currentLink = current.links[linkIndex] ?? current.links[0];
        return {
          label: asString(linkRecord['label'], currentLink.label),
          href: asString(linkRecord['href'], currentLink.href),
        };
      }),
    };
  });
  return next.length > 0 ? next : fallback;
};

export const normalizeMilkbarPageContent = (input: unknown): MilkbarPageContent => {
  const source = isRecord(input) ? input : {};
  const hero = isRecord(source['hero']) ? source['hero'] : {};
  const drawing = isRecord(source['drawing']) ? source['drawing'] : {};
  const philosophy = isRecord(source['philosophy']) ? source['philosophy'] : {};
  const services = isRecord(source['services']) ? source['services'] : {};
  const projects = isRecord(source['projects']) ? source['projects'] : {};
  const process = isRecord(source['process']) ? source['process'] : {};
  const quote = isRecord(source['quote']) ? source['quote'] : {};
  const cta = isRecord(source['cta']) ? source['cta'] : {};
  const footer = isRecord(source['footer']) ? source['footer'] : {};

  return {
    hero: {
      location: asString(hero['location'], DEFAULT_MILKBAR_PAGE_CONTENT.hero.location),
      indexLabel: asString(hero['indexLabel'], DEFAULT_MILKBAR_PAGE_CONTENT.hero.indexLabel),
      titleLines: asStringArray(hero['titleLines'], DEFAULT_MILKBAR_PAGE_CONTENT.hero.titleLines),
      lede: asString(hero['lede'], DEFAULT_MILKBAR_PAGE_CONTENT.hero.lede),
      primaryCtaLabel: asString(
        hero['primaryCtaLabel'],
        DEFAULT_MILKBAR_PAGE_CONTENT.hero.primaryCtaLabel
      ),
      secondaryCtaLabel: asString(
        hero['secondaryCtaLabel'],
        DEFAULT_MILKBAR_PAGE_CONTENT.hero.secondaryCtaLabel
      ),
    },
    drawing: {
      eyebrow: asString(drawing['eyebrow'], DEFAULT_MILKBAR_PAGE_CONTENT.drawing.eyebrow),
      title: asString(drawing['title'], DEFAULT_MILKBAR_PAGE_CONTENT.drawing.title),
      emphasis: asString(drawing['emphasis'], DEFAULT_MILKBAR_PAGE_CONTENT.drawing.emphasis),
      description: asString(
        drawing['description'],
        DEFAULT_MILKBAR_PAGE_CONTENT.drawing.description
      ),
      ctaLabel: asString(drawing['ctaLabel'], DEFAULT_MILKBAR_PAGE_CONTENT.drawing.ctaLabel),
      hint: asString(drawing['hint'], DEFAULT_MILKBAR_PAGE_CONTENT.drawing.hint),
    },
    philosophy: {
      eyebrow: asString(philosophy['eyebrow'], DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.eyebrow),
      title: asString(philosophy['title'], DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.title),
      emphasis: asString(
        philosophy['emphasis'],
        DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.emphasis
      ),
      body: asString(philosophy['body'], DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.body),
      closing: asString(philosophy['closing'], DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.closing),
      caption: asString(philosophy['caption'], DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.caption),
      principles: normalizePrinciples(philosophy['principles']),
    },
    services: {
      eyebrow: asString(services['eyebrow'], DEFAULT_MILKBAR_PAGE_CONTENT.services.eyebrow),
      label: asString(services['label'], DEFAULT_MILKBAR_PAGE_CONTENT.services.label),
      title: asString(services['title'], DEFAULT_MILKBAR_PAGE_CONTENT.services.title),
      emphasis: asString(services['emphasis'], DEFAULT_MILKBAR_PAGE_CONTENT.services.emphasis),
    },
    projects: {
      eyebrow: asString(projects['eyebrow'], DEFAULT_MILKBAR_PAGE_CONTENT.projects.eyebrow),
      label: asString(projects['label'], DEFAULT_MILKBAR_PAGE_CONTENT.projects.label),
      title: asString(projects['title'], DEFAULT_MILKBAR_PAGE_CONTENT.projects.title),
      emphasis: asString(projects['emphasis'], DEFAULT_MILKBAR_PAGE_CONTENT.projects.emphasis),
    },
    process: {
      eyebrow: asString(process['eyebrow'], DEFAULT_MILKBAR_PAGE_CONTENT.process.eyebrow),
      label: asString(process['label'], DEFAULT_MILKBAR_PAGE_CONTENT.process.label),
      title: asString(process['title'], DEFAULT_MILKBAR_PAGE_CONTENT.process.title),
      emphasis: asString(process['emphasis'], DEFAULT_MILKBAR_PAGE_CONTENT.process.emphasis),
      steps: normalizeProcessSteps(process['steps']),
    },
    metrics: normalizeMetrics(source['metrics']),
    quote: {
      eyebrow: asString(quote['eyebrow'], DEFAULT_MILKBAR_PAGE_CONTENT.quote.eyebrow),
      text: asString(quote['text'], DEFAULT_MILKBAR_PAGE_CONTENT.quote.text),
      emphasis: asString(quote['emphasis'], DEFAULT_MILKBAR_PAGE_CONTENT.quote.emphasis),
      attribution: asString(
        quote['attribution'],
        DEFAULT_MILKBAR_PAGE_CONTENT.quote.attribution
      ),
    },
    cta: {
      title: asString(cta['title'], DEFAULT_MILKBAR_PAGE_CONTENT.cta.title),
      emphasis: asString(cta['emphasis'], DEFAULT_MILKBAR_PAGE_CONTENT.cta.emphasis),
      description: asString(cta['description'], DEFAULT_MILKBAR_PAGE_CONTENT.cta.description),
      emailPlaceholder: asString(
        cta['emailPlaceholder'],
        DEFAULT_MILKBAR_PAGE_CONTENT.cta.emailPlaceholder
      ),
      submitLabel: asString(cta['submitLabel'], DEFAULT_MILKBAR_PAGE_CONTENT.cta.submitLabel),
      loadingLabel: asString(cta['loadingLabel'], DEFAULT_MILKBAR_PAGE_CONTENT.cta.loadingLabel),
      successMessage: asString(
        cta['successMessage'],
        DEFAULT_MILKBAR_PAGE_CONTENT.cta.successMessage
      ),
      note: asString(cta['note'], DEFAULT_MILKBAR_PAGE_CONTENT.cta.note),
    },
    footer: {
      brandName: asString(footer['brandName'], DEFAULT_MILKBAR_PAGE_CONTENT.footer.brandName),
      address: asString(footer['address'], DEFAULT_MILKBAR_PAGE_CONTENT.footer.address),
      tagline: asString(footer['tagline'], DEFAULT_MILKBAR_PAGE_CONTENT.footer.tagline),
      columns: normalizeFooterColumns(footer['columns']),
      copyright: asString(footer['copyright'], DEFAULT_MILKBAR_PAGE_CONTENT.footer.copyright),
    },
  };
};

const normalizeVector = (input: unknown, fallback: Vector): Vector => {
  const record = isRecord(input) ? input : {};
  return {
    x: asNumber(record['x'], fallback.x),
    y: asNumber(record['y'], fallback.y),
    z: asNumber(record['z'], fallback.z),
  };
};

const normalizeProject = (input: unknown, index: number): MilkbarProjectCmsRecord | null => {
  const record = isRecord(input) ? input : {};
  const code = asString(record['code'], '').toUpperCase();
  if (code.length === 0) return null;
  return {
    code,
    name: asString(record['name'], code),
    projectType: asString(record['projectType'], 'Architecture Project'),
    city: asString(record['city'], 'Amsterdam'),
    country: asString(record['country'], 'NL'),
    stats:
      typeof record['stats'] === 'string'
        ? splitMultiline(record['stats'])
        : asStringArray(record['stats'], []),
    description: asString(record['description'], 'Project description pending.'),
    order: asNumber(record['order'], index),
    status: record['status'] === 'draft' ? 'draft' : 'published',
    cameraPosition: normalizeVector(record['cameraPosition'], { x: 20, y: 15, z: 20 }),
    cameraTarget: normalizeVector(record['cameraTarget'], { x: 0, y: 6, z: 0 }),
  };
};

const normalizeService = (input: unknown, index: number): MilkbarServiceCmsRecord | null => {
  const record = isRecord(input) ? input : {};
  const code = asString(record['code'], '').toUpperCase();
  if (code.length === 0) return null;
  return {
    code,
    title: asString(record['title'], code),
    description: asString(record['description'], 'Service description pending.'),
    order: asNumber(record['order'], index),
  };
};

const normalizeProjects = (input: unknown): MilkbarProjectCmsRecord[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry, index) => normalizeProject(entry, index))
    .filter((entry): entry is MilkbarProjectCmsRecord => entry !== null);
};

const normalizeServices = (input: unknown): MilkbarServiceCmsRecord[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry, index) => normalizeService(entry, index))
    .filter((entry): entry is MilkbarServiceCmsRecord => entry !== null);
};

const normalizeUpdateInput = (input: unknown): MilkbarCmsUpdateInput => {
  if (!isRecord(input)) throw badRequestError('Invalid Milkbar CMS payload.');
  return {
    pageContent: normalizeMilkbarPageContent(input['pageContent']),
    projects: normalizeProjects(input['projects']),
    services: normalizeServices(input['services']),
  };
};

const toInquiry = (record: AnyRecord): MilkbarInquiryCmsRecord => ({
  email: asString(record['email'], ''),
  createdAt:
    record['createdAt'] instanceof Date
      ? record['createdAt'].toISOString()
      : typeof record['createdAt'] === 'string'
        ? record['createdAt']
        : null,
  status: asString(record['status'], 'pending'),
  source: asString(record['source'], 'unknown'),
});

const sourceStatus = () => {
  const local = resolveArchMongoSourceConfig('local');
  const cloud = resolveArchMongoSourceConfig('cloud');
  return {
    local: {
      configured: local.configured,
      dbName: local.dbName,
      uriLabel: redactMongoUri(local.uri),
    },
    cloud: {
      configured: cloud.configured,
      dbName: cloud.dbName,
      uriLabel: redactMongoUri(cloud.uri),
    },
  };
};

export async function getMilkbarDesignersCmsSnapshot(): Promise<MilkbarCmsSnapshot> {
  return await withArchDb(async (db) => {
    const pageContentDoc = await db
      .collection(PAGE_CONTENT_COLLECTION)
      .findOne<{ content?: unknown; updatedAt?: Date | string | null }>({ key: PAGE_CONTENT_KEY });
    const [projects, services, inquiries] = await Promise.all([
      db
        .collection<MilkbarProjectCmsRecord>('projects')
        .find({}, { projection: { _id: 0 } })
        .sort({ order: 1, code: 1 })
        .toArray(),
      db
        .collection<MilkbarServiceCmsRecord>('services')
        .find({}, { projection: { _id: 0 } })
        .sort({ order: 1, code: 1 })
        .toArray(),
      db
        .collection<AnyRecord>('inquiries')
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    ]);
    const updatedAt =
      pageContentDoc?.updatedAt instanceof Date
        ? pageContentDoc.updatedAt.toISOString()
        : typeof pageContentDoc?.updatedAt === 'string'
          ? pageContentDoc.updatedAt
          : null;

    return {
      ok: true,
      pageContent: normalizeMilkbarPageContent(pageContentDoc?.content),
      projects: normalizeProjects(projects),
      services: normalizeServices(services),
      inquiries: inquiries.map(toInquiry).filter((entry) => entry.email.length > 0),
      sourceStatus: sourceStatus(),
      counts: {
        projects: projects.length,
        services: services.length,
        inquiries: inquiries.length,
      },
      updatedAt,
    };
  });
}

export async function saveMilkbarDesignersCmsSnapshot(
  input: unknown
): Promise<MilkbarCmsSnapshot> {
  const updateInput = normalizeUpdateInput(input);
  const now = new Date();

  return await withArchDb(async (db) => {
    await db.collection(PAGE_CONTENT_COLLECTION).updateOne(
      { key: PAGE_CONTENT_KEY },
      {
        $set: {
          key: PAGE_CONTENT_KEY,
          content: updateInput.pageContent,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    await Promise.all(
      updateInput.projects.map((project) =>
        db.collection('projects').updateOne(
          { code: project.code },
          {
            $set: {
              ...project,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        )
      )
    );

    await Promise.all(
      updateInput.services.map((service) =>
        db.collection('services').updateOne(
          { code: service.code },
          {
            $set: {
              ...service,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        )
      )
    );

    return await getMilkbarDesignersCmsSnapshot();
  });
}
