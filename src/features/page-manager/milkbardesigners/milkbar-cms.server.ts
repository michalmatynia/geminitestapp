/* eslint-disable max-lines, max-lines-per-function, complexity */

import 'server-only';

import { MongoClient, type Db } from 'mongodb';

import {
  DEFAULT_MILKBAR_LOCALIZED_CONTENT,
  DEFAULT_MILKBAR_PAGE_CONTENT,
  DEFAULT_MILKBAR_PAGE_SETTINGS,
  MILKBAR_LOCALES,
  type MilkbarCmsSnapshot,
  type MilkbarCmsSourceStatus,
  type MilkbarCmsUpdateInput,
  type MilkbarFooterColumn,
  type MilkbarInquiryCmsRecord,
  type MilkbarLocale,
  type MilkbarLocalizedContent,
  type MilkbarMetric,
  type MilkbarPageContent,
  type MilkbarPageSettings,
  type MilkbarPrinciple,
  type MilkbarProcessStep,
  type MilkbarProjectCmsRecord,
  type MilkbarSectionVisibility,
  type MilkbarSeoMeta,
  type MilkbarServiceCmsRecord,
} from './milkbar-cms.types';
import { configurationError, badRequestError } from '@/shared/errors/app-error';
import { resolveMongoSourceConfig } from '@/shared/lib/db/mongo-source';
import {
  resolveArchMongoSourceConfig,
  type MongoApplicationSourceConfig,
} from '@/shared/lib/db/utils/mongo';

const SOURCE_PAGE_CONTENT_COLLECTION = 'milkbar_page_content';
const SOURCE_PROJECTS_COLLECTION = 'milkbar_projects';
const SOURCE_SERVICES_COLLECTION = 'milkbar_services';
const RUNTIME_PAGE_CONTENT_COLLECTION = 'page_content';
const RUNTIME_PROJECTS_COLLECTION = 'projects';
const RUNTIME_SERVICES_COLLECTION = 'services';
const RUNTIME_INQUIRIES_COLLECTION = 'inquiries';
const PAGE_CONTENT_KEY = 'home';

type AnyRecord = Record<string, unknown>;
type Vector = { x: number; y: number; z: number };
type RequiredMongoConfig = MongoApplicationSourceConfig & { uri: string; dbName: string };
type MilkbarCmsCollections = {
  pageContent: string;
  projects: string;
  services: string;
};
type MilkbarCmsData = {
  hasPageContent: boolean;
  localizedContent: MilkbarLocalizedContent;
  pageSettings: MilkbarPageSettings;
  projects: MilkbarProjectCmsRecord[];
  services: MilkbarServiceCmsRecord[];
  inquiries: MilkbarInquiryCmsRecord[];
  updatedAt: string | null;
};

const SOURCE_COLLECTIONS: MilkbarCmsCollections = {
  pageContent: SOURCE_PAGE_CONTENT_COLLECTION,
  projects: SOURCE_PROJECTS_COLLECTION,
  services: SOURCE_SERVICES_COLLECTION,
};

const RUNTIME_COLLECTIONS: MilkbarCmsCollections = {
  pageContent: RUNTIME_PAGE_CONTENT_COLLECTION,
  projects: RUNTIME_PROJECTS_COLLECTION,
  services: RUNTIME_SERVICES_COLLECTION,
};

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

const asBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
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
    return `${prefix}${username !== undefined && username.length > 0 ? username : '***'}:***@`;
  });
};

const getMongoClientOptions = (uri: string): ConstructorParameters<typeof MongoClient>[1] => ({
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  ...(uri.includes('127.0.0.1') || uri.includes('localhost') ? { directConnection: true } : {}),
});

const assertConfigured = (config: MongoApplicationSourceConfig, label: string): RequiredMongoConfig => {
  const uri = config.uri;
  const dbName = config.dbName;
  if (
    !config.configured ||
    uri === null ||
    uri.trim().length === 0 ||
    dbName === null ||
    dbName.trim().length === 0
  ) {
    throw configurationError(`${label} MongoDB is not configured.`);
  }
  return { ...config, uri, dbName };
};

async function withMongoDb<T>(
  config: MongoApplicationSourceConfig,
  label: string,
  work: (db: Db) => Promise<T>
): Promise<T> {
  const configured = assertConfigured(config, label);
  const client = new MongoClient(configured.uri, getMongoClientOptions(configured.uri));
  try {
    await client.connect();
    return await work(client.db(configured.dbName));
  } finally {
    await client.close();
  }
}

async function withSourceOfTruthDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const config = await resolveMongoSourceConfig('local');
  return await withMongoDb(config, 'GeminiTest App local source-of-truth', work);
}

async function withRuntimeDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const config = resolveArchMongoSourceConfig('local');
  return await withMongoDb(config, 'Milkbardesigners local runtime', work);
}

async function ensureMilkbarCmsIndexes(
  db: Db,
  collections: MilkbarCmsCollections
): Promise<void> {
  await Promise.all([
    db.collection(collections.pageContent).createIndex({ key: 1 }, { unique: true }),
    db.collection(collections.projects).createIndex({ code: 1 }, { unique: true }),
    db.collection(collections.services).createIndex({ code: 1 }, { unique: true }),
  ]);
}

async function writeMilkbarCmsData(
  db: Db,
  collections: MilkbarCmsCollections,
  input: MilkbarCmsUpdateInput,
  now: Date
): Promise<void> {
  await ensureMilkbarCmsIndexes(db, collections);

  await db.collection(collections.pageContent).updateOne(
    { key: PAGE_CONTENT_KEY },
    {
      $set: {
        key: PAGE_CONTENT_KEY,
        localizedContent: input.localizedContent,
        pageSettings: input.pageSettings,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  const projectCodes = input.projects.map((project) => project.code);
  await Promise.all(
    input.projects.map((project) =>
      db.collection(collections.projects).updateOne(
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
  await db
    .collection(collections.projects)
    .deleteMany(projectCodes.length > 0 ? { code: { $nin: projectCodes } } : {});

  const serviceCodes = input.services.map((service) => service.code);
  await Promise.all(
    input.services.map((service) =>
      db.collection(collections.services).updateOne(
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
  await db
    .collection(collections.services)
    .deleteMany(serviceCodes.length > 0 ? { code: { $nin: serviceCodes } } : {});
}

async function readMilkbarCmsData(
  db: Db,
  collections: MilkbarCmsCollections,
  includeInquiries: boolean
): Promise<MilkbarCmsData> {
  const pageContentDoc = await db
    .collection(collections.pageContent)
    .findOne<{
      localizedContent?: unknown;
      content?: unknown;
      pageSettings?: unknown;
      updatedAt?: Date | string | null;
    }>({ key: PAGE_CONTENT_KEY });

  const [projectDocs, serviceDocs, inquiryDocs] = await Promise.all([
    db
      .collection<MilkbarProjectCmsRecord>(collections.projects)
      .find({}, { projection: { _id: 0 } })
      .sort({ order: 1, code: 1 })
      .toArray(),
    db
      .collection<MilkbarServiceCmsRecord>(collections.services)
      .find({}, { projection: { _id: 0 } })
      .sort({ order: 1, code: 1 })
      .toArray(),
    includeInquiries
      ? db
          .collection<AnyRecord>(RUNTIME_INQUIRIES_COLLECTION)
          .find({}, { projection: { _id: 0 } })
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray()
      : Promise.resolve([]),
  ]);

  // Migration: accept legacy 'content' field (EN only) from pre-localization docs
  const rawLocalized: unknown =
    pageContentDoc?.localizedContent !== undefined
      ? pageContentDoc.localizedContent
      : pageContentDoc?.content !== undefined
        ? { en: pageContentDoc.content }
        : undefined;

  return {
    hasPageContent: pageContentDoc !== null,
    localizedContent: normalizeLocalizedContent(rawLocalized),
    pageSettings: normalizePageSettings(pageContentDoc?.pageSettings),
    projects: normalizeProjects(projectDocs),
    services: normalizeServices(serviceDocs),
    inquiries: inquiryDocs.map(toInquiry).filter((entry) => entry.email.length > 0),
    updatedAt: toOptionalIsoDate(pageContentDoc?.updatedAt),
  };
}

const hasSourceOfTruthData = (data: MilkbarCmsData): boolean =>
  data.hasPageContent || data.projects.length > 0 || data.services.length > 0;

const toMongoSourceStatus = (
  config: MongoApplicationSourceConfig
): MilkbarCmsSourceStatus['sourceOfTruth'] => ({
  configured: config.configured,
  dbName: config.dbName,
  uriLabel: redactMongoUri(config.uri),
});

const getSourceStatus = async (): Promise<MilkbarCmsSourceStatus> => {
  const [sourceOfTruth, runtimeLocal] = await Promise.all([
    resolveMongoSourceConfig('local'),
    Promise.resolve(resolveArchMongoSourceConfig('local')),
  ]);
  const runtimeCloud = resolveArchMongoSourceConfig('cloud');
  return {
    sourceOfTruth: toMongoSourceStatus(sourceOfTruth),
    runtimeLocal: toMongoSourceStatus(runtimeLocal),
    runtimeCloud: toMongoSourceStatus(runtimeCloud),
  };
};

const normalizePrinciples = (value: unknown, fallback: typeof DEFAULT_MILKBAR_PAGE_CONTENT.philosophy.principles): MilkbarPrinciple[] => {
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

const normalizeProcessSteps = (value: unknown, fallback: typeof DEFAULT_MILKBAR_PAGE_CONTENT.process.steps): MilkbarProcessStep[] => {
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

const normalizeMetrics = (value: unknown, fallback: MilkbarMetric[]): MilkbarMetric[] => {
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

const normalizeFooterColumns = (value: unknown, fallback: MilkbarFooterColumn[]): MilkbarFooterColumn[] => {
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

export const normalizeMilkbarPageContent = (input: unknown, fallback: MilkbarPageContent = DEFAULT_MILKBAR_PAGE_CONTENT): MilkbarPageContent => {
  const source = isRecord(input) ? input : {};
  const hero = isRecord(source['hero']) ? source['hero'] : {};
  const drawing = isRecord(source['drawing']) ? source['drawing'] : {};
  const philosophy = isRecord(source['philosophy']) ? source['philosophy'] : {};
  const services = isRecord(source['services']) ? source['services'] : {};
  const projects = isRecord(source['projects']) ? source['projects'] : {};
  const process = isRecord(source['process']) ? source['process'] : {};
  const caseStudy = isRecord(source['caseStudy']) ? source['caseStudy'] : {};
  const quote = isRecord(source['quote']) ? source['quote'] : {};
  const cta = isRecord(source['cta']) ? source['cta'] : {};
  const footer = isRecord(source['footer']) ? source['footer'] : {};

  return {
    hero: {
      location: asString(hero['location'], fallback.hero.location),
      indexLabel: asString(hero['indexLabel'], fallback.hero.indexLabel),
      titleLines: asStringArray(hero['titleLines'], fallback.hero.titleLines),
      lede: asString(hero['lede'], fallback.hero.lede),
      primaryCtaLabel: asString(hero['primaryCtaLabel'], fallback.hero.primaryCtaLabel),
      secondaryCtaLabel: asString(hero['secondaryCtaLabel'], fallback.hero.secondaryCtaLabel),
    },
    drawing: {
      eyebrow: asString(drawing['eyebrow'], fallback.drawing.eyebrow),
      title: asString(drawing['title'], fallback.drawing.title),
      emphasis: asString(drawing['emphasis'], fallback.drawing.emphasis),
      description: asString(drawing['description'], fallback.drawing.description),
      ctaLabel: asString(drawing['ctaLabel'], fallback.drawing.ctaLabel),
      hint: asString(drawing['hint'], fallback.drawing.hint),
    },
    philosophy: {
      eyebrow: asString(philosophy['eyebrow'], fallback.philosophy.eyebrow),
      title: asString(philosophy['title'], fallback.philosophy.title),
      emphasis: asString(philosophy['emphasis'], fallback.philosophy.emphasis),
      body: asString(philosophy['body'], fallback.philosophy.body),
      closing: asString(philosophy['closing'], fallback.philosophy.closing),
      caption: asString(philosophy['caption'], fallback.philosophy.caption),
      principles: normalizePrinciples(philosophy['principles'], fallback.philosophy.principles),
    },
    services: {
      eyebrow: asString(services['eyebrow'], fallback.services.eyebrow),
      label: asString(services['label'], fallback.services.label),
      title: asString(services['title'], fallback.services.title),
      emphasis: asString(services['emphasis'], fallback.services.emphasis),
    },
    projects: {
      eyebrow: asString(projects['eyebrow'], fallback.projects.eyebrow),
      label: asString(projects['label'], fallback.projects.label),
      title: asString(projects['title'], fallback.projects.title),
      emphasis: asString(projects['emphasis'], fallback.projects.emphasis),
    },
    process: {
      eyebrow: asString(process['eyebrow'], fallback.process.eyebrow),
      label: asString(process['label'], fallback.process.label),
      title: asString(process['title'], fallback.process.title),
      emphasis: asString(process['emphasis'], fallback.process.emphasis),
      steps: normalizeProcessSteps(process['steps'], fallback.process.steps),
    },
    metrics: normalizeMetrics(source['metrics'], fallback.metrics),
    caseStudy: {
      eyebrow: asString(caseStudy['eyebrow'], fallback.caseStudy.eyebrow),
      label: asString(caseStudy['label'], fallback.caseStudy.label),
      title: asString(caseStudy['title'], fallback.caseStudy.title),
      titleEmphasis: asString(caseStudy['titleEmphasis'], fallback.caseStudy.titleEmphasis),
      heading: asString(caseStudy['heading'], fallback.caseStudy.heading),
      headingEmphasis: asString(caseStudy['headingEmphasis'], fallback.caseStudy.headingEmphasis),
      body: asString(caseStudy['body'], fallback.caseStudy.body),
      stats: normalizeMetrics(caseStudy['stats'], fallback.caseStudy.stats),
    },
    quote: {
      eyebrow: asString(quote['eyebrow'], fallback.quote.eyebrow),
      text: asString(quote['text'], fallback.quote.text),
      emphasis: asString(quote['emphasis'], fallback.quote.emphasis),
      attribution: asString(quote['attribution'], fallback.quote.attribution),
    },
    cta: {
      title: asString(cta['title'], fallback.cta.title),
      emphasis: asString(cta['emphasis'], fallback.cta.emphasis),
      description: asString(cta['description'], fallback.cta.description),
      emailPlaceholder: asString(cta['emailPlaceholder'], fallback.cta.emailPlaceholder),
      submitLabel: asString(cta['submitLabel'], fallback.cta.submitLabel),
      loadingLabel: asString(cta['loadingLabel'], fallback.cta.loadingLabel),
      successMessage: asString(cta['successMessage'], fallback.cta.successMessage),
      note: asString(cta['note'], fallback.cta.note),
    },
    footer: {
      brandName: asString(footer['brandName'], fallback.footer.brandName),
      address: asString(footer['address'], fallback.footer.address),
      tagline: asString(footer['tagline'], fallback.footer.tagline),
      columns: normalizeFooterColumns(footer['columns'], fallback.footer.columns),
      copyright: asString(footer['copyright'], fallback.footer.copyright),
    },
  };
};

const normalizeLocalizedContent = (input: unknown): MilkbarLocalizedContent => {
  const source = isRecord(input) ? input : {};
  return {
    en: normalizeMilkbarPageContent(source['en'], DEFAULT_MILKBAR_LOCALIZED_CONTENT.en),
    de: normalizeMilkbarPageContent(source['de'], DEFAULT_MILKBAR_LOCALIZED_CONTENT.de),
    pl: normalizeMilkbarPageContent(source['pl'], DEFAULT_MILKBAR_LOCALIZED_CONTENT.pl),
  };
};

const normalizeSeoMeta = (input: unknown, fallback: MilkbarSeoMeta): MilkbarSeoMeta => {
  const record = isRecord(input) ? input : {};
  return {
    title: asString(record['title'], fallback.title),
    description: asString(record['description'], fallback.description),
    ogTitle: asString(record['ogTitle'], fallback.ogTitle),
    ogDescription: asString(record['ogDescription'], fallback.ogDescription),
  };
};

const normalizeSectionVisibility = (input: unknown): MilkbarSectionVisibility => {
  const record = isRecord(input) ? input : {};
  const defaults = DEFAULT_MILKBAR_PAGE_SETTINGS.visibility;
  return {
    drawing: asBoolean(record['drawing'], defaults.drawing),
    philosophy: asBoolean(record['philosophy'], defaults.philosophy),
    services: asBoolean(record['services'], defaults.services),
    projects: asBoolean(record['projects'], defaults.projects),
    process: asBoolean(record['process'], defaults.process),
    metrics: asBoolean(record['metrics'], defaults.metrics),
    caseStudy: asBoolean(record['caseStudy'], defaults.caseStudy),
    quote: asBoolean(record['quote'], defaults.quote),
    cta: asBoolean(record['cta'], defaults.cta),
  };
};

const normalizePublishedLocales = (input: unknown): MilkbarLocale[] => {
  if (!Array.isArray(input)) return DEFAULT_MILKBAR_PAGE_SETTINGS.publishedLocales;
  const valid = input.filter((entry): entry is MilkbarLocale =>
    entry === 'en' || entry === 'de' || entry === 'pl'
  );
  return valid.length > 0 ? valid : DEFAULT_MILKBAR_PAGE_SETTINGS.publishedLocales;
};

const normalizeDefaultLocale = (input: unknown): MilkbarLocale => {
  if (input === 'en' || input === 'de' || input === 'pl') return input;
  return DEFAULT_MILKBAR_PAGE_SETTINGS.defaultLocale;
};

const normalizePageSettings = (input: unknown): MilkbarPageSettings => {
  const record = isRecord(input) ? input : {};
  const seoRecord = isRecord(record['seo']) ? record['seo'] : {};
  return {
    visibility: normalizeSectionVisibility(record['visibility']),
    seo: {
      en: normalizeSeoMeta(seoRecord['en'], DEFAULT_MILKBAR_PAGE_SETTINGS.seo.en),
      de: normalizeSeoMeta(seoRecord['de'], DEFAULT_MILKBAR_PAGE_SETTINGS.seo.de),
      pl: normalizeSeoMeta(seoRecord['pl'], DEFAULT_MILKBAR_PAGE_SETTINGS.seo.pl),
    },
    defaultLocale: normalizeDefaultLocale(record['defaultLocale']),
    publishedLocales: normalizePublishedLocales(record['publishedLocales']),
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
    emphasis: asString(record['emphasis'], ''),
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

  // Accept legacy pageContent field (pre-localization) as EN locale
  const localizedRaw: unknown =
    input['localizedContent'] !== undefined
      ? input['localizedContent']
      : input['pageContent'] !== undefined
        ? { en: input['pageContent'] }
        : undefined;

  return {
    localizedContent: normalizeLocalizedContent(localizedRaw),
    pageSettings: normalizePageSettings(input['pageSettings']),
    projects: normalizeProjects(input['projects']),
    services: normalizeServices(input['services']),
  };
};

const toOptionalIsoDate = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return null;
};

const toInquiry = (record: AnyRecord): MilkbarInquiryCmsRecord => {
  const localeRaw = record['locale'];
  return {
    email: asString(record['email'], ''),
    createdAt: toOptionalIsoDate(record['createdAt']),
    status: asString(record['status'], 'pending'),
    source: asString(record['source'], 'unknown'),
    ...(typeof localeRaw === 'string' && localeRaw.length > 0 && { locale: localeRaw }),
  };
};

export async function getMilkbarDesignersCmsSnapshot(): Promise<MilkbarCmsSnapshot> {
  const [status, sourceData, runtimeData] = await Promise.all([
    getSourceStatus(),
    withSourceOfTruthDb((db) => readMilkbarCmsData(db, SOURCE_COLLECTIONS, false)),
    withRuntimeDb((db) => readMilkbarCmsData(db, RUNTIME_COLLECTIONS, true)),
  ]);
  const useSourceOfTruth = hasSourceOfTruthData(sourceData);
  const editableData = useSourceOfTruth ? sourceData : runtimeData;

  return {
    ok: true,
    localizedContent: editableData.localizedContent,
    pageSettings: editableData.pageSettings,
    projects: editableData.projects,
    services: editableData.services,
    inquiries: runtimeData.inquiries,
    sourceStatus: status,
    counts: {
      sourceOfTruth: {
        projects: sourceData.projects.length,
        services: sourceData.services.length,
      },
      runtimeLocal: {
        projects: runtimeData.projects.length,
        services: runtimeData.services.length,
        inquiries: runtimeData.inquiries.length,
      },
    },
    contentSource: useSourceOfTruth ? 'sourceOfTruth' : 'runtimeFallback',
    updatedAt: editableData.updatedAt,
  };
}

export async function saveMilkbarDesignersCmsSnapshot(
  input: unknown
): Promise<MilkbarCmsSnapshot> {
  const updateInput = normalizeUpdateInput(input);
  const now = new Date();

  await withSourceOfTruthDb((db) => writeMilkbarCmsData(db, SOURCE_COLLECTIONS, updateInput, now));
  await withRuntimeDb((db) => writeMilkbarCmsData(db, RUNTIME_COLLECTIONS, updateInput, now));

  return await getMilkbarDesignersCmsSnapshot();
}

// Expose for locale-keyed iteration in callers
export { MILKBAR_LOCALES };
