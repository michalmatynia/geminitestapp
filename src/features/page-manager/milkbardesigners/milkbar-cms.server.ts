/* eslint-disable max-lines, max-lines-per-function, complexity */

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
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
import {
  resolveArchMongoSourceConfig,
  type MongoApplicationSourceConfig,
} from '@/shared/lib/db/utils/mongo';
import { getAsset3DFromLookupRepositories } from '@/features/viewer3d/server';
import { uploadMilkbarAsset3DInRedisRuntime } from '@/features/viewer3d/workers/milkbarAsset3DFastCometUploadQueue';
import { uploadCmsFastCometMediaInRedisRuntime } from '@/features/cms/workers/cmsFastCometMediaUploadQueue';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { MILKBAR_CMS_VISUALISATION_FOLDER } from '@/shared/lib/files/constants';
import { getCmsBuilderImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import { getPublicPathFromStoredPath } from '@/shared/lib/files/services/storage/file-storage-service';
import { resolveMilkbarFastCometStorageProfile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-storage';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logActivity } from '@/shared/utils/observability/activity-service';

const SOURCE_PAGE_CONTENT_COLLECTION = 'milkbar_page_content';
const SOURCE_PROJECTS_COLLECTION = 'milkbar_projects';
const SOURCE_SERVICES_COLLECTION = 'milkbar_services';
const RUNTIME_PAGE_CONTENT_COLLECTION = 'page_content';
const RUNTIME_PROJECTS_COLLECTION = 'projects';
const RUNTIME_SERVICES_COLLECTION = 'services';
const RUNTIME_INQUIRIES_COLLECTION = 'inquiries';
const PAGE_CONTENT_KEY = 'home';
const MILKBAR_APPLICATION_ID = 'arch';
const MILKBAR_APPLICATION_NAME = 'Milkbar Designers';
const MILKBAR_SOURCE_SERVICE = 'milkbar-cms';
const MILKBAR_MODEL_PUBLIC_PATH_PREFIX = '/uploads/cms/models/';
const MILKBAR_VISUALISATION_PUBLIC_PATH_PREFIX = '/uploads/cms/visualisation/';
const MILKBAR_FASTCOMET_MODELS_MIRROR_ROOT = path.resolve(
  process.cwd(),
  'hosting',
  'fastcomet',
  'milkbardesigners.com',
  'public_html',
  'uploads',
  'cms',
  'models'
);

type AnyRecord = Record<string, unknown>;
type Vector = { x: number; y: number; z: number };
type RequiredMongoConfig = MongoApplicationSourceConfig & { uri: string; dbName: string };
type MilkbarMongoOptions = { timeoutMs?: number };
type MilkbarModelUrlTarget = 'local' | 'fastcomet';
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

const buildMilkbarLogContext = (
  context: Record<string, unknown> = {}
): Record<string, unknown> => ({
  applicationId: MILKBAR_APPLICATION_ID,
  applicationName: MILKBAR_APPLICATION_NAME,
  sourceService: MILKBAR_SOURCE_SERVICE,
  surface: 'milkbardesigners',
  ...context,
});

const logMilkbarSystemEvent = (input: {
  level: 'info' | 'warn' | 'error';
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
}): void => {
  void logSystemEvent({
    level: input.level,
    source: MILKBAR_SOURCE_SERVICE,
    service: MILKBAR_SOURCE_SERVICE,
    message: input.message,
    error: input.error,
    context: buildMilkbarLogContext(input.context),
  });
};

const logMilkbarActivity = (input: {
  type: string;
  description: string;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown>;
}): void => {
  void logActivity({
    type: input.type,
    description: input.description,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? MILKBAR_SOURCE_SERVICE,
    applicationId: MILKBAR_APPLICATION_ID,
    applicationName: MILKBAR_APPLICATION_NAME,
    sourceService: MILKBAR_SOURCE_SERVICE,
    metadata: buildMilkbarLogContext(input.metadata),
  });
};

const createEmptyMilkbarCmsData = (): MilkbarCmsData => ({
  hasPageContent: false,
  localizedContent: normalizeLocalizedContent(undefined),
  pageSettings: normalizePageSettings(undefined),
  projects: [],
  services: [],
  inquiries: [],
  updatedAt: null,
});

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

const asOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

const getRequiredFallbackItem = <T>(items: readonly T[], label: string): T => {
  const item = items[0];
  if (item === undefined) {
    throw configurationError(`Milkbar CMS default ${label} fallback is empty.`);
  }
  return item;
};

const isAbsoluteHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const joinUrl = (baseUrl: string, pathname: string): string => {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const cleanPath = pathname.trim().replace(/^\/+/, '');
  return `${base}/${cleanPath}`;
};

const metadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined => {
  const value = metadata?.[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isMilkbarModelPublicPath = (value: string | undefined): value is string =>
  value?.startsWith(MILKBAR_MODEL_PUBLIC_PATH_PREFIX) === true;

const toMilkbarModelPublicPath = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const publicPath = getPublicPathFromStoredPath(value);
  if (publicPath === null) return undefined;
  return isMilkbarModelPublicPath(publicPath) ? publicPath : undefined;
};

const readMilkbarFastCometModelMirrorFiles = (): string[] => {
  try {
    return fs.readdirSync(MILKBAR_FASTCOMET_MODELS_MIRROR_ROOT);
  } catch {
    return [];
  }
};

const resolveLatestMilkbarFastCometMirrorPath = (
  publicPath: string
): string => {
  if (!publicPath.startsWith(`${MILKBAR_MODEL_PUBLIC_PATH_PREFIX}procedural/`)) {
    return publicPath;
  }

  const filename = path.basename(publicPath);
  const timestampedFile = readMilkbarFastCometModelMirrorFiles()
    .filter((entry) => /^\d+-/.test(entry) && entry.endsWith(`-${filename}`))
    .sort((left, right) => right.localeCompare(left))
    .at(0);

  return timestampedFile === undefined
    ? publicPath
    : `${MILKBAR_MODEL_PUBLIC_PATH_PREFIX}${timestampedFile}`;
};

const resolveMilkbarModelUrlForTarget = (
  value: string | undefined,
  target: MilkbarModelUrlTarget
): string | undefined => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return undefined;
  const publicPath = toMilkbarModelPublicPath(trimmed);
  if (publicPath === undefined) return trimmed;
  if (target === 'local') return publicPath;
  return joinUrl(
    resolveMilkbarFastCometStorageProfile().publicBaseUrl,
    resolveLatestMilkbarFastCometMirrorPath(publicPath)
  );
};

const resolveMilkbarAssetPublicPath = (asset: Asset3DRecord): string | undefined => {
  if (metadataString(asset.metadata, 'storageProfile') !== 'milkbarCms') return undefined;
  const metadataPath = metadataString(asset.metadata, 'publicPath');
  const filepathPath =
    typeof asset.filepath === 'string' ? getPublicPathFromStoredPath(asset.filepath) : null;
  const fileUrlPath =
    typeof asset.fileUrl === 'string' ? getPublicPathFromStoredPath(asset.fileUrl) : null;
  const publicPath = metadataPath ?? filepathPath ?? fileUrlPath;
  return isMilkbarModelPublicPath(publicPath ?? undefined) ? publicPath ?? undefined : undefined;
};

const resolveMilkbarAssetUrl = (
  asset: Asset3DRecord,
  target: MilkbarModelUrlTarget
): string | undefined => {
  const milkbarPublicPath = resolveMilkbarAssetPublicPath(asset);
  if (milkbarPublicPath !== undefined) {
    return resolveMilkbarModelUrlForTarget(milkbarPublicPath, target);
  }

  const directCandidates = [asset.filepath, asset.fileUrl].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const absolute = directCandidates.find(isAbsoluteHttpUrl);
  if (absolute !== undefined) return absolute.trim();

  const publicBaseUrl = metadataString(asset.metadata, 'publicBaseUrl');
  const publicPath = metadataString(asset.metadata, 'publicPath');
  if (publicBaseUrl !== undefined && publicPath !== undefined) {
    return joinUrl(publicBaseUrl, publicPath);
  }

  const storedPath = directCandidates.find((candidate) => candidate.startsWith('/'));
  if (publicBaseUrl !== undefined && storedPath !== undefined) {
    return joinUrl(publicBaseUrl, storedPath);
  }

  return undefined;
};

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

const getMilkbarMongoClientOptions = (
  uri: string,
  options?: MilkbarMongoOptions
): ConstructorParameters<typeof MongoClient>[1] => {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  return {
    ...getMongoClientOptions(uri),
    connectTimeoutMS: timeoutMs,
    serverSelectionTimeoutMS: timeoutMs,
  };
};

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
  work: (db: Db) => Promise<T>,
  options?: MilkbarMongoOptions
): Promise<T> {
  const configured = assertConfigured(config, label);
  const client = new MongoClient(configured.uri, getMilkbarMongoClientOptions(configured.uri, options));
  try {
    await client.connect();
    return await work(client.db(configured.dbName));
  } finally {
    await client.close();
  }
}

async function withSourceOfTruthDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const config = resolveArchMongoSourceConfig('local');
  return await withMongoDb(config, 'Milkbardesigners local source-of-truth', work);
}

async function withOptionalSourceOfTruthDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const config = resolveArchMongoSourceConfig('local');
  return await withMongoDb(config, 'Milkbardesigners local source-of-truth', work, { timeoutMs: 750 });
}

async function withRuntimeDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const config = resolveArchMongoSourceConfig('local');
  return await withMongoDb(config, 'Milkbardesigners local runtime', work);
}

async function withOptionalRuntimeDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const config = resolveArchMongoSourceConfig('local');
  return await withMongoDb(config, 'Milkbardesigners local runtime', work, { timeoutMs: 750 });
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
      content?: unknown;
      localizedContent?: unknown;
      pageSettings?: unknown;
      updatedAt?: Date | string | null;
    }>(
      { key: PAGE_CONTENT_KEY },
      { projection: { _id: 0, content: 1, localizedContent: 1, pageSettings: 1, updatedAt: 1 } }
    );

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

  return {
    hasPageContent: pageContentDoc !== null,
    localizedContent: normalizeLocalizedContent(
      pageContentDoc?.localizedContent ?? { en: pageContentDoc?.content }
    ),
    pageSettings: normalizePageSettings(pageContentDoc?.pageSettings),
    projects: normalizeProjects(projectDocs),
    services: normalizeServices(serviceDocs),
    inquiries: inquiryDocs.map(toInquiry).filter((entry) => entry.email.length > 0),
    updatedAt: toOptionalIsoDate(pageContentDoc?.updatedAt),
  };
}

const readMilkbarCmsDataOrEmpty = async (
  read: () => Promise<MilkbarCmsData>,
  label: string
): Promise<MilkbarCmsData> => {
  try {
    return await read();
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      source: 'milkbar-cms',
      message: `[milkbar-cms] ${label} is unavailable; continuing with fallback data.`,
      error,
    });
    return createEmptyMilkbarCmsData();
  }
};

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
    Promise.resolve(resolveArchMongoSourceConfig('local')),
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
    const current = fallback[index] ?? getRequiredFallbackItem(fallback, 'principle');
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
    const current = fallback[index] ?? getRequiredFallbackItem(fallback, 'process step');
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
    const current = fallback[index] ?? getRequiredFallbackItem(fallback, 'metric');
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
    const current = fallback[index] ?? getRequiredFallbackItem(fallback, 'footer column');
    const rawLinks = Array.isArray(record['links']) ? record['links'] : current.links;
    return {
      title: asString(record['title'], current.title),
      links: rawLinks.map((link, linkIndex) => {
        const linkRecord = isRecord(link) ? link : {};
        const currentLink = current.links[linkIndex] ?? getRequiredFallbackItem(current.links, 'footer link');
        return {
          label: asString(linkRecord['label'], currentLink.label),
          href: asString(linkRecord['href'], currentLink.href),
        };
      }),
    };
  });
  return next.length > 0 ? next : fallback;
};

const normalizeNavLinks = (input: unknown, fallback: MilkbarPageContent['nav']['links']): MilkbarPageContent['nav']['links'] => {
  if (!Array.isArray(input)) return fallback;
  const result = input
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((l) => ({
      label: asString(l['label'], ''),
      href: asString(l['href'], '#'),
    }))
    .filter((l) => l.label.length > 0);
  return result.length > 0 ? result : fallback;
};

export const normalizeMilkbarPageContent = (input: unknown, fallback: MilkbarPageContent = DEFAULT_MILKBAR_PAGE_CONTENT): MilkbarPageContent => {
  const source = isRecord(input) ? input : {};
  const nav = isRecord(source['nav']) ? source['nav'] : {};
  const hero = isRecord(source['hero']) ? source['hero'] : {};
  const drawing = isRecord(source['drawing']) ? source['drawing'] : {};
  const codeStudio = isRecord(source['codeStudio']) ? source['codeStudio'] : {};
  const philosophy = isRecord(source['philosophy']) ? source['philosophy'] : {};
  const services = isRecord(source['services']) ? source['services'] : {};
  const projects = isRecord(source['projects']) ? source['projects'] : {};
  const process = isRecord(source['process']) ? source['process'] : {};
  const caseStudy = isRecord(source['caseStudy']) ? source['caseStudy'] : {};
  const quote = isRecord(source['quote']) ? source['quote'] : {};
  const cta = isRecord(source['cta']) ? source['cta'] : {};
  const footer = isRecord(source['footer']) ? source['footer'] : {};

  return {
    nav: {
      brandSub: asString(nav['brandSub'], fallback.nav.brandSub),
      links: normalizeNavLinks(nav['links'], fallback.nav.links),
      ctaLabel: asString(nav['ctaLabel'], fallback.nav.ctaLabel),
    },
    hero: {
      location: asString(hero['location'], fallback.hero.location),
      indexLabel: asString(hero['indexLabel'], fallback.hero.indexLabel),
      titleLines: asStringArray(hero['titleLines'], fallback.hero.titleLines),
      lede: asString(hero['lede'], fallback.hero.lede),
      primaryCtaLabel: asString(hero['primaryCtaLabel'], fallback.hero.primaryCtaLabel),
      secondaryCtaLabel: asString(hero['secondaryCtaLabel'], fallback.hero.secondaryCtaLabel),
      ...(asOptionalString(hero['modelAssetId']) !== undefined
        ? { modelAssetId: asOptionalString(hero['modelAssetId']) }
        : {}),
      ...(asOptionalString(hero['modelUrl']) !== undefined
        ? { modelUrl: asOptionalString(hero['modelUrl']) }
        : {}),
    },
    drawing: {
      eyebrow: asString(drawing['eyebrow'], fallback.drawing.eyebrow),
      title: asString(drawing['title'], fallback.drawing.title),
      emphasis: asString(drawing['emphasis'], fallback.drawing.emphasis),
      description: asString(drawing['description'], fallback.drawing.description),
      ctaLabel: asString(drawing['ctaLabel'], fallback.drawing.ctaLabel),
      hint: asString(drawing['hint'], fallback.drawing.hint),
      thumbImages: asStringArray(drawing['thumbImages'], fallback.drawing.thumbImages),
      asset3dProjectCodes: asStringArray(
        drawing['asset3dProjectCodes'] ?? drawing['asset3dSlots'],
        fallback.drawing.asset3dProjectCodes
      ),
      ...(asOptionalString(drawing['interiorModelAssetId']) !== undefined
        ? { interiorModelAssetId: asOptionalString(drawing['interiorModelAssetId']) }
        : {}),
      ...(asOptionalString(drawing['interiorModelUrl']) !== undefined
        ? { interiorModelUrl: asOptionalString(drawing['interiorModelUrl']) }
        : {}),
    },
    codeStudio: {
      eyebrow: asString(codeStudio['eyebrow'], fallback.codeStudio.eyebrow),
      subLabel: asString(codeStudio['subLabel'], fallback.codeStudio.subLabel),
      heading: asString(codeStudio['heading'], fallback.codeStudio.heading),
      headingEmphasis: asString(codeStudio['headingEmphasis'], fallback.codeStudio.headingEmphasis),
      copy: asString(codeStudio['copy'], fallback.codeStudio.copy),
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
      projectsViewMode: ((): 'solid' | 'wireframe' | 'edges' => {
        const val = projects['projectsViewMode'];
        if (val === 'solid' || val === 'wireframe' || val === 'edges') return val;
        return 'edges';
      })(),
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
      ...(asOptionalString(caseStudy['projectCode']) !== undefined
        ? { projectCode: asOptionalString(caseStudy['projectCode']) }
        : {}),
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
    codeStudio: asBoolean(record['codeStudio'], defaults.codeStudio),
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
    contactEmail: asString(record['contactEmail'], DEFAULT_MILKBAR_PAGE_SETTINGS.contactEmail),
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
    ...(typeof record['modelAssetId'] === 'string' && record['modelAssetId'].trim().length > 0
      ? { modelAssetId: record['modelAssetId'].trim() }
      : {}),
    ...(typeof record['modelUrl'] === 'string' && record['modelUrl'].trim().length > 0
      ? { modelUrl: record['modelUrl'].trim() }
      : {}),
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

  return {
    localizedContent: normalizeLocalizedContent(
      input['localizedContent'] ?? { en: input['pageContent'] }
    ),
    pageSettings: normalizePageSettings(input['pageSettings']),
    projects: normalizeProjects(input['projects']),
    services: normalizeServices(input['services']),
  };
};

const collectModelAssetIds = (input: MilkbarCmsUpdateInput): string[] => {
  const ids = new Set<string>();

  MILKBAR_LOCALES.forEach((locale) => {
    const content = input.localizedContent[locale];
    const heroId = content.hero.modelAssetId?.trim() ?? '';
    const interiorId = content.drawing.interiorModelAssetId?.trim() ?? '';
    if (heroId.length > 0) ids.add(heroId);
    if (interiorId.length > 0) ids.add(interiorId);
  });

  input.projects.forEach((project) => {
    const modelId = project.modelAssetId?.trim() ?? '';
    if (modelId.length > 0) ids.add(modelId);
  });

  return Array.from(ids);
};

const resolveModelAssetUrlMap = async (
  input: MilkbarCmsUpdateInput,
  target: MilkbarModelUrlTarget
): Promise<Map<string, string>> => {
  const ids = collectModelAssetIds(input);
  if (ids.length === 0) return new Map();

  try {
    const records = await Promise.all(
      ids.map(async (id) => ({ id, asset: await getAsset3DFromLookupRepositories(id) }))
    );
    return new Map(
      records.flatMap(({ id, asset }) => {
        if (asset === null) return [];
        const url = resolveMilkbarAssetUrl(asset, target);
        return url === undefined ? [] : [[id, url] as const];
      })
    );
  } catch {
    return new Map();
  }
};

const isMilkbarVisualisationPublicPath = (value: string | undefined): value is string =>
  value?.startsWith(MILKBAR_VISUALISATION_PUBLIC_PATH_PREFIX) === true;

const resolveMilkbarVisualisationPublicPath = (
  value: string | undefined
): string | undefined => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return undefined;
  const publicPath = getPublicPathFromStoredPath(trimmed) ?? undefined;
  return isMilkbarVisualisationPublicPath(publicPath) ? publicPath : undefined;
};

const collectDrawingImagePublicPaths = (input: MilkbarCmsUpdateInput): string[] => {
  const paths = new Set<string>();
  MILKBAR_LOCALES.forEach((locale) => {
    const content = input.localizedContent[locale];
    content.drawing.thumbImages.forEach((image) => {
      const publicPath = resolveMilkbarVisualisationPublicPath(image);
      if (publicPath !== undefined) paths.add(publicPath);
    });
  });
  return Array.from(paths);
};

const resolveCmsImageRecordPublicPath = (
  imageFile: ImageFileRecord
): string | undefined => {
  const metadataPath = metadataString(imageFile.metadata, 'publicPath');
  const filepathPath =
    typeof imageFile.filepath === 'string'
      ? getPublicPathFromStoredPath(imageFile.filepath) ?? undefined
      : undefined;
  const publicUrlPath =
    typeof imageFile.publicUrl === 'string'
      ? getPublicPathFromStoredPath(imageFile.publicUrl) ?? undefined
      : undefined;
  const urlPath =
    typeof imageFile.url === 'string'
      ? getPublicPathFromStoredPath(imageFile.url) ?? undefined
      : undefined;
  return [metadataPath, filepathPath, publicUrlPath, urlPath].find(
    isMilkbarVisualisationPublicPath
  );
};

const isCmsImageUploadedToFastComet = (imageFile: ImageFileRecord): boolean => {
  if (imageFile.storageProvider === 'fastcomet') return true;
  const storageSource = metadataString(imageFile.metadata, 'storageSource');
  const status = metadataString(imageFile.metadata, 'fastCometUploadStatus');
  return storageSource === 'fastcomet' || status === 'completed';
};

const uploadMilkbarCmsMediaToFastCometOnSave = async (
  input: MilkbarCmsUpdateInput
): Promise<void> => {
  const publicPaths = collectDrawingImagePublicPaths(input);
  if (publicPaths.length === 0) return;

  const repository = await getCmsBuilderImageFileRepository();
  const imageFiles = await repository.listImageFiles();
  const imageFileByPublicPath = new Map<string, ImageFileRecord>();
  imageFiles.forEach((imageFile) => {
    const publicPath = resolveCmsImageRecordPublicPath(imageFile);
    if (publicPath !== undefined) imageFileByPublicPath.set(publicPath, imageFile);
  });

  await Promise.all(
    publicPaths.map(async (publicPath) => {
      const imageFile = imageFileByPublicPath.get(publicPath);
      if (imageFile === undefined) {
        logMilkbarSystemEvent({
          level: 'warn',
          message: '[milkbar-cms] staged drawing image record was not found for FastComet upload.',
          context: { publicPath },
        });
        return;
      }
      if (isCmsImageUploadedToFastComet(imageFile)) return;
      await uploadCmsFastCometMediaInRedisRuntime({
        folder: MILKBAR_CMS_VISUALISATION_FOLDER,
        imageFileId: imageFile.id,
        mimetype: imageFile.mimetype,
        publicPath,
        requestedAt: new Date().toISOString(),
      });
    })
  );
};

const isMilkbarAssetUploadedToFastComet = (asset: Asset3DRecord): boolean => {
  const storageSource = metadataString(asset.metadata, 'storageSource');
  const status = metadataString(asset.metadata, 'fastCometUploadStatus');
  if (storageSource === 'fastcomet' || status === 'completed') return true;
  return [asset.filepath, asset.fileUrl].some(
    (value) => typeof value === 'string' && isAbsoluteHttpUrl(value)
  );
};

const uploadMilkbarModelAssetsToFastCometOnSave = async (
  input: MilkbarCmsUpdateInput
): Promise<void> => {
  const assetIds = collectModelAssetIds(input);
  if (assetIds.length === 0) return;

  await Promise.all(
    assetIds.map(async (assetId) => {
      const asset = await getAsset3DFromLookupRepositories(assetId);
      if (asset === null) {
        logMilkbarSystemEvent({
          level: 'warn',
          message: '[milkbar-cms] staged 3D asset record was not found for FastComet upload.',
          context: { assetId },
        });
        return;
      }
      if (isMilkbarAssetUploadedToFastComet(asset)) return;
      await uploadMilkbarAsset3DInRedisRuntime({
        assetId,
        requestedAt: new Date().toISOString(),
      });
    })
  );
};

export const uploadMilkbarCmsFilesToFastCometOnSave = async (
  input: MilkbarCmsUpdateInput
): Promise<void> => {
  await Promise.all([
    uploadMilkbarCmsMediaToFastCometOnSave(input),
    uploadMilkbarModelAssetsToFastCometOnSave(input),
  ]);
};

const optionalStringProp = <K extends string>(
  key: K,
  value: string | undefined
): Partial<Record<K, string>> => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return {};
  const result: Partial<Record<K, string>> = {};
  result[key] = trimmed;
  return result;
};

const withoutHeroModelFields = (
  hero: MilkbarPageContent['hero']
): Omit<MilkbarPageContent['hero'], 'modelAssetId' | 'modelUrl'> => {
  const copy = { ...hero };
  delete copy.modelAssetId;
  delete copy.modelUrl;
  return copy;
};

const withoutDrawingModelFields = (
  drawing: MilkbarPageContent['drawing']
): Omit<MilkbarPageContent['drawing'], 'interiorModelAssetId' | 'interiorModelUrl'> => {
  const copy = { ...drawing };
  delete copy.interiorModelAssetId;
  delete copy.interiorModelUrl;
  return copy;
};

const withoutProjectModelFields = (
  project: MilkbarProjectCmsRecord
): Omit<MilkbarProjectCmsRecord, 'modelAssetId' | 'modelUrl'> => {
  const copy = { ...project };
  delete copy.modelAssetId;
  delete copy.modelUrl;
  return copy;
};

const resolveCmsModelUrl = ({
  assetId,
  assetUrls,
  currentUrl,
  target,
}: {
  assetId: string | undefined;
  assetUrls: Map<string, string>;
  currentUrl: string | undefined;
  target: MilkbarModelUrlTarget;
}): string | undefined => {
  if (assetId !== undefined && assetId.length > 0) {
    return assetUrls.get(assetId) ?? resolveMilkbarModelUrlForTarget(currentUrl, target);
  }
  return resolveMilkbarModelUrlForTarget(currentUrl, target);
};

const enrichPageContentWithModelUrls = (
  content: MilkbarPageContent,
  assetUrls: Map<string, string>,
  target: MilkbarModelUrlTarget
): MilkbarPageContent => {
  const heroAssetId = content.hero.modelAssetId?.trim();
  const interiorAssetId = content.drawing.interiorModelAssetId?.trim();
  const heroUrl = resolveCmsModelUrl({
    assetId: heroAssetId,
    assetUrls,
    currentUrl: content.hero.modelUrl,
    target,
  });
  const interiorUrl = resolveCmsModelUrl({
    assetId: interiorAssetId,
    assetUrls,
    currentUrl: content.drawing.interiorModelUrl,
    target,
  });
  const hero: MilkbarPageContent['hero'] = {
    ...withoutHeroModelFields(content.hero),
    ...optionalStringProp('modelAssetId', heroAssetId),
    ...optionalStringProp('modelUrl', heroUrl),
  };
  const drawing: MilkbarPageContent['drawing'] = {
    ...withoutDrawingModelFields(content.drawing),
    ...optionalStringProp('interiorModelAssetId', interiorAssetId),
    ...optionalStringProp('interiorModelUrl', interiorUrl),
  };

  return { ...content, hero, drawing };
};

const enrichMilkbarCmsUpdateWithModelUrls = async (
  input: MilkbarCmsUpdateInput,
  target: MilkbarModelUrlTarget = 'local'
): Promise<MilkbarCmsUpdateInput> => {
  const assetUrls = await resolveModelAssetUrlMap(input, target);
  const localizedContent: MilkbarLocalizedContent = {
    en: enrichPageContentWithModelUrls(input.localizedContent.en, assetUrls, target),
    de: enrichPageContentWithModelUrls(input.localizedContent.de, assetUrls, target),
    pl: enrichPageContentWithModelUrls(input.localizedContent.pl, assetUrls, target),
  };

  return {
    ...input,
    localizedContent,
    projects: input.projects.map((project) => {
      const modelAssetId = project.modelAssetId?.trim();
      const modelUrl = resolveCmsModelUrl({
        assetId: modelAssetId,
        assetUrls,
        currentUrl: project.modelUrl,
        target,
      });
      return {
        ...withoutProjectModelFields(project),
        ...optionalStringProp('modelAssetId', modelAssetId),
        ...optionalStringProp('modelUrl', modelUrl),
      };
    }),
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
    readMilkbarCmsDataOrEmpty(
      () => withOptionalSourceOfTruthDb((db) => readMilkbarCmsData(db, SOURCE_COLLECTIONS, false)),
      'source-of-truth CMS database'
    ),
    readMilkbarCmsDataOrEmpty(
      () => withOptionalRuntimeDb((db) => readMilkbarCmsData(db, RUNTIME_COLLECTIONS, true)),
      'local Milkbar runtime database'
    ),
  ]);
  const cloudRuntimeData =
    hasSourceOfTruthData(sourceData) || hasSourceOfTruthData(runtimeData)
      ? createEmptyMilkbarCmsData()
      : await readMilkbarCmsDataOrEmpty(
          () => withCloudRuntimeDb((db) => readMilkbarCmsData(db, RUNTIME_COLLECTIONS, false)),
          'cloud Milkbar runtime database'
        );
  const useSourceOfTruth = hasSourceOfTruthData(sourceData);
  const hasRuntimeData = hasSourceOfTruthData(runtimeData);
  let editableData = cloudRuntimeData;
  if (hasRuntimeData) editableData = runtimeData;
  if (useSourceOfTruth) editableData = sourceData;

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
  const normalizedInput = normalizeUpdateInput(input);
  await uploadMilkbarCmsFilesToFastCometOnSave(normalizedInput);
  const updateInput = await enrichMilkbarCmsUpdateWithModelUrls(normalizedInput, 'local');
  const now = new Date();

  try {
    await withSourceOfTruthDb((db) => writeMilkbarCmsData(db, SOURCE_COLLECTIONS, updateInput, now));
  } catch (error) {
    logMilkbarSystemEvent({
      level: 'error',
      message: '[milkbar-cms] failed to save source-of-truth data.',
      error,
      context: {
        collectionGroup: 'source-of-truth',
        projectCount: updateInput.projects.length,
        serviceCount: updateInput.services.length,
      },
    });
    throw error;
  }

  try {
    await withOptionalRuntimeDb((db) => writeMilkbarCmsData(db, RUNTIME_COLLECTIONS, updateInput, now));
  } catch (error) {
    logMilkbarSystemEvent({
      level: 'warn',
      message: '[milkbar-cms] local Milkbar runtime database is unavailable; saved source-of-truth only.',
      error,
      context: {
        collectionGroup: 'runtime',
        projectCount: updateInput.projects.length,
        serviceCount: updateInput.services.length,
      },
    });
  }

  logMilkbarActivity({
    type: 'milkbar.cms.save',
    description: 'Milkbar Designers CMS content was saved.',
    entityId: PAGE_CONTENT_KEY,
    entityType: MILKBAR_SOURCE_SERVICE,
    metadata: {
      projectCount: updateInput.projects.length,
      serviceCount: updateInput.services.length,
      sourceCollections: Object.values(SOURCE_COLLECTIONS),
      runtimeCollections: Object.values(RUNTIME_COLLECTIONS),
    },
  });

  return await getMilkbarDesignersCmsSnapshot();
}

export async function patchMilkbarInquiryStatus(
  email: string,
  status: 'pending' | 'contacted'
): Promise<{ ok: boolean }> {
  if (email.trim().length === 0) throw badRequestError('email is required.');

  await withRuntimeDb(async (db) => {
    await db.collection(RUNTIME_INQUIRIES_COLLECTION).updateOne(
      { email },
      { $set: { status } }
    );
  });

  logMilkbarActivity({
    type: 'milkbar.inquiry.status_updated',
    description: `Milkbar Designers inquiry status changed to ${status}.`,
    entityId: email,
    entityType: 'milkbar-inquiry',
    metadata: {
      email,
      status,
      collection: RUNTIME_INQUIRIES_COLLECTION,
    },
  });

  return { ok: true };
}

async function withCloudRuntimeDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const config = resolveArchMongoSourceConfig('cloud');
  return await withMongoDb(config, 'Milkbardesigners cloud runtime', work);
}

export type MilkbarPushToCloudResult = {
  collections: string[];
  projectCount: number;
  serviceCount: number;
  updatedAt: string;
};

export type MilkbarPushProgress = {
  step: number;
  total: number;
  phase: 'reading' | 'writing' | 'done';
  message: string;
};

export async function pushMilkbarRuntimeToCloud(
  onProgress?: (p: MilkbarPushProgress) => Promise<void>
): Promise<MilkbarPushToCloudResult> {
  const report = onProgress ?? (() => Promise.resolve());
  const now = new Date();

  await report({
    step: 1,
    total: 4,
    phase: 'reading',
    message: 'Reading local runtime or source CMS data…',
  });

  const runtimeData = await readMilkbarCmsDataOrEmpty(
    () => withOptionalRuntimeDb((db) => readMilkbarCmsData(db, RUNTIME_COLLECTIONS, false)),
    'local Milkbar runtime database'
  );
  const localData = hasSourceOfTruthData(runtimeData)
    ? runtimeData
    : await withSourceOfTruthDb((db) =>
        readMilkbarCmsData(db, SOURCE_COLLECTIONS, false)
      );

  if (!hasSourceOfTruthData(localData)) {
    throw configurationError(
      'No Milkbar CMS data is available to push. Save the CMS source data before pushing to cloud.'
    );
  }

  await report({
    step: 2,
    total: 4,
    phase: 'reading',
    message: `Read ${localData.projects.length} projects, ${localData.services.length} services, page content`,
  });

  const updateInput = await enrichMilkbarCmsUpdateWithModelUrls(
    {
      localizedContent: localData.localizedContent,
      pageSettings: localData.pageSettings,
      projects: localData.projects,
      services: localData.services,
    },
    'fastcomet'
  );

  await report({ step: 3, total: 4, phase: 'writing', message: 'Writing to cloud database…' });

  await withCloudRuntimeDb((db) =>
    writeMilkbarCmsData(db, RUNTIME_COLLECTIONS, updateInput, now)
  );

  await report({
    step: 4,
    total: 4,
    phase: 'done',
    message: `Synced ${localData.projects.length} projects, ${localData.services.length} services`,
  });

  return {
    collections: [
      RUNTIME_PAGE_CONTENT_COLLECTION,
      RUNTIME_PROJECTS_COLLECTION,
      RUNTIME_SERVICES_COLLECTION,
    ],
    projectCount: localData.projects.length,
    serviceCount: localData.services.length,
    updatedAt: now.toISOString(),
  };
}

// Expose for locale-keyed iteration in callers
export { MILKBAR_LOCALES };
