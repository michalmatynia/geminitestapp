import { Prisma } from '@prisma/client';
import { ObjectId, type WithId, type Filter, type Document } from 'mongodb';

import { isBaseIntegrationSlug } from '@/features/integrations/constants/slugs';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  IntegrationRecord,
  IntegrationConnectionRecord,
  IntegrationRepository,
  IntegrationWithConnections
} from '../types/integrations';

const INTEGRATION_COLLECTION = 'integrations';
const INTEGRATION_CONNECTION_COLLECTION = 'integration_connections';
const DEFAULT_CONNECTION_SETTING_KEY = 'base_export_default_connection_id';
const PRODUCT_SYNC_PROFILE_SETTINGS_KEY = 'product_sync_profiles';
const ACTIVE_TEMPLATE_SETTING_KEY = 'base_export_active_template_id';
const ACTIVE_TEMPLATE_SCOPE_SEPARATOR = '::';

const toDocumentIdCandidates = (id: string): Array<string | ObjectId> => {
  if (ObjectId.isValid(id) && id.length === 24) {
    return [id, new ObjectId(id)];
  }
  return [id];
};

const toConnectionIdCandidates = (
  id: string
): { asStrings: string[]; asDocumentIds: Array<string | ObjectId> } => {
  const asDocumentIds = toDocumentIdCandidates(id);
  const asStrings = new Set<string>(
    asDocumentIds.map((candidate) =>
      candidate instanceof ObjectId ? candidate.toHexString() : String(candidate)
    )
  );
  return {
    asStrings: Array.from(asStrings),
    asDocumentIds,
  };
};

const stripActiveTemplateScopesForConnection = (
  rawValue: string | null | undefined,
  connectionId: string
): string | null => {
  if (!rawValue) return rawValue ?? null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return rawValue;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return rawValue;
  }

  const record = parsed as Record<string, unknown>;
  const byScopeRaw = record['byScope'];
  if (!byScopeRaw || typeof byScopeRaw !== 'object' || Array.isArray(byScopeRaw)) {
    return rawValue;
  }

  const scopePrefix = `${connectionId}${ACTIVE_TEMPLATE_SCOPE_SEPARATOR}`;
  let changed = false;
  const nextByScope = Object.entries(byScopeRaw as Record<string, unknown>).reduce(
    (acc, [scopeKey, value]) => {
      if (scopeKey === connectionId || scopeKey.startsWith(scopePrefix)) {
        changed = true;
        return acc;
      }
      acc[scopeKey] = value;
      return acc;
    },
    {} as Record<string, unknown>
  );

  if (!changed) return rawValue;

  return JSON.stringify({
    ...record,
    byScope: nextByScope,
  });
};

const isPrismaNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

type ConnectionDeleteOptions = {
  replacementConnectionId?: string | null | undefined;
};

type ConnectionDependencyCounts = {
  productListings: number;
  categoryMappings: number;
  externalCategories: number;
  producerMappings: number;
  externalProducers: number;
  tagMappings: number;
  externalTags: number;
  total: number;
};

const normalizeOptionalConnectionId = (
  value: string | null | undefined
): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const withDependencyTotal = (
  counts: Omit<ConnectionDependencyCounts, 'total'>
): ConnectionDependencyCounts => ({
  ...counts,
  total:
    counts.productListings +
    counts.categoryMappings +
    counts.externalCategories +
    counts.producerMappings +
    counts.externalProducers +
    counts.tagMappings +
    counts.externalTags,
});

const remapProductSyncProfilesSetting = (
  rawValue: string | null | undefined,
  sourceConnectionId: string,
  replacementConnectionId: string | null
): string | null => {
  if (!rawValue) return rawValue ?? null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return rawValue;
  }

  if (!Array.isArray(parsed)) {
    return rawValue;
  }

  let changed = false;
  const nextProfiles: unknown[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      nextProfiles.push(entry);
      continue;
    }
    const record = entry as Record<string, unknown>;
    const connectionId = typeof record['connectionId'] === 'string'
      ? record['connectionId'].trim()
      : '';
    if (connectionId !== sourceConnectionId) {
      nextProfiles.push(entry);
      continue;
    }

    changed = true;
    if (!replacementConnectionId) continue;
    nextProfiles.push({
      ...record,
      connectionId: replacementConnectionId,
    });
  }

  if (!changed) return rawValue;
  return JSON.stringify(nextProfiles);
};

const updatePrismaConnectionScopedSettings = async (
  connectionId: string,
  replacementConnectionId: string | null
): Promise<void> => {
  const [defaultConnectionSetting, activeTemplateSetting, syncProfilesSetting] =
    await Promise.all([
      prisma.setting.findUnique({
        where: { key: DEFAULT_CONNECTION_SETTING_KEY },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: ACTIVE_TEMPLATE_SETTING_KEY },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
        select: { value: true },
      }),
    ]);

  if (defaultConnectionSetting?.value?.trim() === connectionId) {
    await prisma.setting.upsert({
      where: { key: DEFAULT_CONNECTION_SETTING_KEY },
      update: { value: replacementConnectionId ?? '' },
      create: {
        key: DEFAULT_CONNECTION_SETTING_KEY,
        value: replacementConnectionId ?? '',
      },
    });
  }

  const nextActiveTemplateValue = stripActiveTemplateScopesForConnection(
    activeTemplateSetting?.value ?? null,
    connectionId
  );
  if (nextActiveTemplateValue !== (activeTemplateSetting?.value ?? null)) {
    await prisma.setting.upsert({
      where: { key: ACTIVE_TEMPLATE_SETTING_KEY },
      update: { value: nextActiveTemplateValue ?? '' },
      create: {
        key: ACTIVE_TEMPLATE_SETTING_KEY,
        value: nextActiveTemplateValue ?? '',
      },
    });
  }

  const nextSyncProfilesValue = remapProductSyncProfilesSetting(
    syncProfilesSetting?.value ?? null,
    connectionId,
    replacementConnectionId
  );
  if (nextSyncProfilesValue !== (syncProfilesSetting?.value ?? null)) {
    await prisma.setting.upsert({
      where: { key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
      update: { value: nextSyncProfilesValue ?? '[]' },
      create: {
        key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
        value: nextSyncProfilesValue ?? '[]',
      },
    });
  }
};

const countPrismaConnectionDependencies = async (
  connectionId: string
): Promise<ConnectionDependencyCounts> => {
  const [
    productListings,
    categoryMappings,
    externalCategories,
    producerMappings,
    externalProducers,
    tagMappings,
    externalTags,
  ] = await Promise.all([
    prisma.productListing.count({ where: { connectionId } }),
    prisma.categoryMapping.count({ where: { connectionId } }),
    prisma.externalCategory.count({ where: { connectionId } }),
    prisma.producerMapping.count({ where: { connectionId } }),
    prisma.externalProducer.count({ where: { connectionId } }),
    prisma.tagMapping.count({ where: { connectionId } }),
    prisma.externalTag.count({ where: { connectionId } }),
  ]);

  return withDependencyTotal({
    productListings,
    categoryMappings,
    externalCategories,
    producerMappings,
    externalProducers,
    tagMappings,
    externalTags,
  });
};

const cleanupPrismaConnectionReferences = async (connectionId: string): Promise<void> => {
  await Promise.all([
    prisma.productListing.deleteMany({ where: { connectionId } }),
    prisma.categoryMapping.deleteMany({ where: { connectionId } }),
    prisma.externalCategory.deleteMany({ where: { connectionId } }),
    prisma.producerMapping.deleteMany({ where: { connectionId } }),
    prisma.externalProducer.deleteMany({ where: { connectionId } }),
    prisma.tagMapping.deleteMany({ where: { connectionId } }),
    prisma.externalTag.deleteMany({ where: { connectionId } }),
  ]);
  await updatePrismaConnectionScopedSettings(connectionId, null);
};

const reassignPrismaConnectionReferences = async (
  sourceConnectionId: string,
  replacementConnectionId: string
): Promise<void> => {
  await Promise.all([
    prisma.productListing.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.categoryMapping.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.externalCategory.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.producerMapping.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.externalProducer.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.tagMapping.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.externalTag.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
  ]);
  await updatePrismaConnectionScopedSettings(sourceConnectionId, replacementConnectionId);
};

const resolvePrismaReplacementConnectionId = async (input: {
  connectionId: string;
  integrationId: string;
  replacementConnectionId?: string | null | undefined;
}): Promise<string | null> => {
  const requestedReplacementId = normalizeOptionalConnectionId(
    input.replacementConnectionId
  );
  if (requestedReplacementId) {
    if (requestedReplacementId === input.connectionId) {
      throw badRequestError(
        'Replacement connection must be different from the deleted connection.'
      );
    }

    const replacementConnection = await prisma.integrationConnection.findFirst({
      where: {
        id: requestedReplacementId,
        integrationId: input.integrationId,
      },
      select: { id: true },
    });
    if (!replacementConnection) {
      throw badRequestError(
        'Replacement connection does not exist in this integration.',
        {
          replacementConnectionId: requestedReplacementId,
          integrationId: input.integrationId,
        }
      );
    }
    return replacementConnection.id;
  }

  const fallbackConnection = await prisma.integrationConnection.findFirst({
    where: {
      integrationId: input.integrationId,
      id: { not: input.connectionId },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  return fallbackConnection?.id ?? null;
};

const buildMongoConnectionFieldFilter = (
  candidates: ReturnType<typeof toConnectionIdCandidates>
): Record<string, unknown> => ({
  connectionId: {
    $in: [
      ...candidates.asStrings,
      ...candidates.asDocumentIds.filter(
        (candidate): candidate is ObjectId => candidate instanceof ObjectId
      ),
    ],
  },
});

const countMongoConnectionDependencies = async (
  connectionId: string
): Promise<ConnectionDependencyCounts> => {
  const db = await getMongoDb();
  const candidates = toConnectionIdCandidates(connectionId);
  const filter = {
    _id: {
      $in: candidates.asDocumentIds,
    },
  } as Filter<{ _id: ObjectId | string }>;

  const [
    productListings,
    categoryMappings,
    externalCategories,
    producerMappings,
    externalProducers,
    tagMappings,
    externalTags,
  ] = await Promise.all([
    db.collection('product_listings').countDocuments(filter as Filter<Document>),
    db.collection('category_mappings').countDocuments(filter as Filter<Document>),
    db.collection('external_categories').countDocuments(filter as Filter<Document>),
    db.collection('producer_mappings').countDocuments(filter as Filter<Document>),
    db.collection('external_producers').countDocuments(filter as Filter<Document>),
    db.collection('tag_mappings').countDocuments(filter as Filter<Document>),
    db.collection('external_tags').countDocuments(filter as Filter<Document>),
  ]);
  return withDependencyTotal({
    productListings,
    categoryMappings,
    externalCategories,
    producerMappings,
    externalProducers,
    tagMappings,
    externalTags,
  });
};

const cleanupMongoConnectionReferences = async (connectionId: string): Promise<void> => {
  const db = await getMongoDb();
  const candidates = toConnectionIdCandidates(connectionId);
  const filter = {
    _id: {
      $in: candidates.asDocumentIds,
    },
  } as Filter<{ _id: ObjectId | string }>;

  await Promise.all([
    db.collection('product_listings').deleteMany(filter as Filter<Document>),
    db.collection('category_mappings').deleteMany(filter as Filter<Document>),
    db.collection('external_categories').deleteMany(filter as Filter<Document>),
    db.collection('producer_mappings').deleteMany(filter as Filter<Document>),
    db.collection('external_producers').deleteMany(filter as Filter<Document>),
    db.collection('tag_mappings').deleteMany(filter as Filter<Document>),
    db.collection('external_tags').deleteMany(filter as Filter<Document>),
  ]);
};

const reassignMongoConnectionReferences = async (
  sourceConnectionId: string,
  replacementConnectionId: string
): Promise<void> => {
  const db = await getMongoDb();
  const candidates = toConnectionIdCandidates(sourceConnectionId);
  const filter = {
    _id: {
      $in: candidates.asDocumentIds,
    },
  } as Filter<{ _id: ObjectId | string }>;

  await Promise.all([
    db.collection('product_listings').updateMany(filter as Filter<Document>, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('category_mappings').updateMany(filter as Filter<Document>, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('external_categories').updateMany(filter as Filter<Document>, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('producer_mappings').updateMany(filter as Filter<Document>, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('external_producers').updateMany(filter as Filter<Document>, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('tag_mappings').updateMany(filter as Filter<Document>, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('external_tags').updateMany(filter as Filter<Document>, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
  ]);
};

const updateMongoConnectionScopedSettings = async (
  connectionId: string,
  replacementConnectionId: string | null
): Promise<void> => {
  const db = await getMongoDb();
  const settings = db.collection<{ value?: string }>('settings');
  const [defaultConnectionSetting, activeTemplateSetting, syncProfilesSetting] =
    await Promise.all([
      settings.findOne({
        $or: [
          { _id: DEFAULT_CONNECTION_SETTING_KEY },
          { key: DEFAULT_CONNECTION_SETTING_KEY },
        ],
      }),
      settings.findOne({
        $or: [
          { _id: ACTIVE_TEMPLATE_SETTING_KEY },
          { key: ACTIVE_TEMPLATE_SETTING_KEY },
        ],
      }),
      settings.findOne({
        $or: [
          { _id: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
          { key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
        ],
      }),
    ]);

  if (defaultConnectionSetting?.value?.trim() === connectionId) {
    await settings.updateMany(
      {
        $or: [
          { _id: DEFAULT_CONNECTION_SETTING_KEY },
          { key: DEFAULT_CONNECTION_SETTING_KEY },
        ],
      },
      {
        $set: {
          value: replacementConnectionId ?? '',
          key: DEFAULT_CONNECTION_SETTING_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  const nextActiveTemplateValue = stripActiveTemplateScopesForConnection(
    activeTemplateSetting?.value ?? null,
    connectionId
  );
  if (nextActiveTemplateValue !== (activeTemplateSetting?.value ?? null)) {
    await settings.updateMany(
      {
        $or: [
          { _id: ACTIVE_TEMPLATE_SETTING_KEY },
          { key: ACTIVE_TEMPLATE_SETTING_KEY },
        ],
      },
      {
        $set: {
          value: nextActiveTemplateValue ?? '',
          key: ACTIVE_TEMPLATE_SETTING_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  const nextSyncProfilesValue = remapProductSyncProfilesSetting(
    syncProfilesSetting?.value ?? null,
    connectionId,
    replacementConnectionId
  );
  if (nextSyncProfilesValue !== (syncProfilesSetting?.value ?? null)) {
    await settings.updateMany(
      {
        $or: [
          { _id: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
          { key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
        ],
      },
      {
        $set: {
          value: nextSyncProfilesValue ?? '[]',
          key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }
};

const resolveMongoReplacementConnectionId = async (input: {
  connectionId: string;
  integrationId: string;
  replacementConnectionId?: string | null | undefined;
}): Promise<string | null> => {
  const db = await getMongoDb();
  const requestedReplacementId = normalizeOptionalConnectionId(
    input.replacementConnectionId
  );
  if (requestedReplacementId) {
    if (requestedReplacementId === input.connectionId) {
      throw badRequestError(
        'Replacement connection must be different from the deleted connection.'
      );
    }

    const replacementCandidates = toDocumentIdCandidates(requestedReplacementId);
    const replacement = await db
      .collection<{ _id: string | ObjectId; integrationId: string }>(
        INTEGRATION_CONNECTION_COLLECTION
      )
      .findOne({
        _id: { $in: replacementCandidates },
        integrationId: input.integrationId,
      } as Record<string, unknown>);
    if (!replacement) {
      throw badRequestError(
        'Replacement connection does not exist in this integration.',
        {
          replacementConnectionId: requestedReplacementId,
          integrationId: input.integrationId,
        }
      );
    }
    return replacement._id.toString();
  }

  const sourceCandidates = toDocumentIdCandidates(input.connectionId);
  const fallback = await db
    .collection<{ _id: string | ObjectId; integrationId: string; createdAt?: Date }>(
      INTEGRATION_CONNECTION_COLLECTION
    )
    .find({
      integrationId: input.integrationId,
      _id: { $nin: sourceCandidates },
    } as Record<string, unknown>)
    .sort({ createdAt: 1, _id: 1 })
    .limit(1)
    .toArray();
  return fallback[0]?._id.toString() ?? null;
};

/**
 * MongoDB Documents
 */
type IntegrationDocument = {
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date | null;
};

type IntegrationConnectionDocument = {
  integrationId: string;
  name: string;
  username: string;
  password: string;
  playwrightStorageState?: string | null;
  playwrightStorageStateUpdatedAt?: Date | null;
  playwrightHeadless?: boolean;
  playwrightSlowMo?: number;
  playwrightTimeout?: number;
  playwrightNavigationTimeout?: number;
  playwrightHumanizeMouse?: boolean;
  playwrightMouseJitter?: number;
  playwrightClickDelayMin?: number;
  playwrightClickDelayMax?: number;
  playwrightInputDelayMin?: number;
  playwrightInputDelayMax?: number;
  playwrightActionDelayMin?: number;
  playwrightActionDelayMax?: number;
  playwrightProxyEnabled?: boolean;
  playwrightProxyServer?: string;
  playwrightProxyUsername?: string;
  playwrightProxyPassword?: string | null;
  playwrightEmulateDevice?: boolean;
  playwrightDeviceName?: string;
  playwrightPersonaId?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: Date | null;
  allegroTokenUpdatedAt?: Date | null;
  allegroUseSandbox?: boolean;
  baseApiToken?: string | null;
  baseTokenUpdatedAt?: Date | null;
  baseLastInventoryId?: string | null;
  traderaDefaultTemplateId?: string;
  traderaDefaultDurationHours?: number;
  traderaAutoRelistEnabled?: boolean;
  traderaAutoRelistLeadMinutes?: number;
  traderaApiAppId?: number;
  traderaApiAppKey?: string;
  traderaApiPublicKey?: string;
  traderaApiUserId?: number;
  traderaApiToken?: string;
  traderaApiTokenUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

const CONNECTION_DEFAULTS = {
  playwrightHeadless: true,
  playwrightSlowMo: 0,
  playwrightTimeout: 30000,
  playwrightNavigationTimeout: 30000,
  playwrightHumanizeMouse: true,
  playwrightMouseJitter: 5,
  playwrightClickDelayMin: 50,
  playwrightClickDelayMax: 150,
  playwrightInputDelayMin: 20,
  playwrightInputDelayMax: 80,
  playwrightActionDelayMin: 500,
  playwrightActionDelayMax: 1500,
  playwrightProxyEnabled: false,
  playwrightProxyServer: '',
  playwrightProxyUsername: '',
  playwrightEmulateDevice: false,
  playwrightDeviceName: 'Desktop Chrome',
  playwrightPersonaId: null,
  traderaDefaultTemplateId: '',
  traderaDefaultDurationHours: 72,
  traderaAutoRelistEnabled: true,
  traderaAutoRelistLeadMinutes: 180,
  traderaApiAppId: 0,
  traderaApiAppKey: '',
  traderaApiPublicKey: '',
  traderaApiUserId: 0,
  traderaApiToken: '',
  traderaApiTokenUpdatedAt: null,
};

const toIsoStringOrNull = (value: unknown): string | null => {
  if (value == null) return null;
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? value.toISOString() : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    const timestamp = parsed.getTime();
    return Number.isFinite(timestamp) ? parsed.toISOString() : null;
  }
  return null;
};

const toRequiredIsoString = (value: unknown): string =>
  toIsoStringOrNull(value) ?? new Date(0).toISOString();

const toIntegrationRecord = (
  doc: WithId<IntegrationDocument> | Prisma.IntegrationGetPayload<Record<string, never>>
): IntegrationRecord => ({
  id: 'id' in doc ? doc.id : doc._id.toString(),
  name: doc.name,
  slug: doc.slug,
  createdAt: toRequiredIsoString(doc.createdAt),
  updatedAt: toIsoStringOrNull(doc.updatedAt),
});

const toConnectionRecord = (
  doc: WithId<IntegrationConnectionDocument> | Prisma.IntegrationConnectionGetPayload<Record<string, never>>
): IntegrationConnectionRecord => {
  const isPrisma = 'id' in doc;
  return {
    id: isPrisma ? doc.id : (doc)._id.toString(),
    integrationId: doc.integrationId,
    name: doc.name,
    username: doc.username,
    password: doc.password,
    playwrightStorageState: doc.playwrightStorageState ?? null,
    playwrightStorageStateUpdatedAt: toIsoStringOrNull(
      doc.playwrightStorageStateUpdatedAt
    ),
    playwrightHeadless:
      doc.playwrightHeadless ?? CONNECTION_DEFAULTS.playwrightHeadless,
    playwrightSlowMo:
      doc.playwrightSlowMo ?? CONNECTION_DEFAULTS.playwrightSlowMo,
    playwrightTimeout:
      doc.playwrightTimeout ?? CONNECTION_DEFAULTS.playwrightTimeout,
    playwrightNavigationTimeout:
      doc.playwrightNavigationTimeout ??
      CONNECTION_DEFAULTS.playwrightNavigationTimeout,
    playwrightHumanizeMouse:
      doc.playwrightHumanizeMouse ?? CONNECTION_DEFAULTS.playwrightHumanizeMouse,
    playwrightMouseJitter:
      doc.playwrightMouseJitter ?? CONNECTION_DEFAULTS.playwrightMouseJitter,
    playwrightClickDelayMin:
      doc.playwrightClickDelayMin ?? CONNECTION_DEFAULTS.playwrightClickDelayMin,
    playwrightClickDelayMax:
      doc.playwrightClickDelayMax ?? CONNECTION_DEFAULTS.playwrightClickDelayMax,
    playwrightInputDelayMin:
      doc.playwrightInputDelayMin ?? CONNECTION_DEFAULTS.playwrightInputDelayMin,
    playwrightInputDelayMax:
      doc.playwrightInputDelayMax ?? CONNECTION_DEFAULTS.playwrightInputDelayMax,
    playwrightActionDelayMin:
      doc.playwrightActionDelayMin ?? CONNECTION_DEFAULTS.playwrightActionDelayMin,
    playwrightActionDelayMax:
      doc.playwrightActionDelayMax ?? CONNECTION_DEFAULTS.playwrightActionDelayMax,
    playwrightProxyEnabled:
      doc.playwrightProxyEnabled ?? CONNECTION_DEFAULTS.playwrightProxyEnabled,
    playwrightProxyServer:
      doc.playwrightProxyServer ?? CONNECTION_DEFAULTS.playwrightProxyServer,
    playwrightProxyUsername:
      doc.playwrightProxyUsername ?? CONNECTION_DEFAULTS.playwrightProxyUsername,
    playwrightProxyPassword: doc.playwrightProxyPassword ?? null,
    playwrightEmulateDevice:
      doc.playwrightEmulateDevice ?? CONNECTION_DEFAULTS.playwrightEmulateDevice,
    playwrightDeviceName:
      doc.playwrightDeviceName ?? CONNECTION_DEFAULTS.playwrightDeviceName,
    playwrightPersonaId:
      doc.playwrightPersonaId ?? CONNECTION_DEFAULTS.playwrightPersonaId,
    allegroAccessToken: doc.allegroAccessToken ?? null,
    allegroRefreshToken: doc.allegroRefreshToken ?? null,
    allegroTokenType: doc.allegroTokenType ?? null,
    allegroScope: doc.allegroScope ?? null,
    allegroExpiresAt: toIsoStringOrNull(doc.allegroExpiresAt),
    allegroTokenUpdatedAt: toIsoStringOrNull(doc.allegroTokenUpdatedAt),
    allegroUseSandbox: doc.allegroUseSandbox ?? false,
    baseApiToken: doc.baseApiToken ?? null,
    baseTokenUpdatedAt: toIsoStringOrNull(doc.baseTokenUpdatedAt),
    baseLastInventoryId: doc.baseLastInventoryId ?? null,
    traderaDefaultTemplateId:
      doc.traderaDefaultTemplateId ?? CONNECTION_DEFAULTS.traderaDefaultTemplateId,
    traderaDefaultDurationHours:
      doc.traderaDefaultDurationHours ??
      CONNECTION_DEFAULTS.traderaDefaultDurationHours,
    traderaAutoRelistEnabled:
      doc.traderaAutoRelistEnabled ??
      CONNECTION_DEFAULTS.traderaAutoRelistEnabled,
    traderaAutoRelistLeadMinutes:
      doc.traderaAutoRelistLeadMinutes ??
      CONNECTION_DEFAULTS.traderaAutoRelistLeadMinutes,
    traderaApiAppId: doc.traderaApiAppId ?? CONNECTION_DEFAULTS.traderaApiAppId,
    traderaApiAppKey:
      doc.traderaApiAppKey ?? CONNECTION_DEFAULTS.traderaApiAppKey,
    traderaApiPublicKey:
      doc.traderaApiPublicKey ?? CONNECTION_DEFAULTS.traderaApiPublicKey,
    traderaApiUserId:
      doc.traderaApiUserId ?? CONNECTION_DEFAULTS.traderaApiUserId,
    traderaApiToken: doc.traderaApiToken ?? CONNECTION_DEFAULTS.traderaApiToken,
    traderaApiTokenUpdatedAt: toIsoStringOrNull(doc.traderaApiTokenUpdatedAt),
    createdAt: toRequiredIsoString(doc.createdAt),
    updatedAt: toIsoStringOrNull(doc.updatedAt),
  };
};

export async function getIntegrationRepository(): Promise<IntegrationRepository> {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return getMongoIntegrationRepository();
  }
  return getPrismaIntegrationRepository();
}

export async function getIntegrationsWithConnections(): Promise<IntegrationWithConnections[]> {
  const repo = await getIntegrationRepository();
  const integrations = await repo.listIntegrations();
  
  return Promise.all(
    integrations.map(async (integration) => {
      const connections = await repo.listConnections(integration.id);
      return {
        ...integration,
        connections,
      } as IntegrationWithConnections;
    })
  );
}

export function getPrismaIntegrationRepository(): IntegrationRepository {
  return {
    async listIntegrations(): Promise<IntegrationRecord[]> {
      const docs = await prisma.integration.findMany({
        orderBy: { name: 'asc' },
      });
      return docs.map(toIntegrationRecord);
    },

    async upsertIntegration(input: {
      name: string;
      slug: string;
    }): Promise<IntegrationRecord> {
      const doc = await prisma.integration.upsert({
        where: { slug: input.slug },
        update: { name: input.name },
        create: { name: input.name, slug: input.slug },
      });
      return toIntegrationRecord(doc);
    },

    async getIntegrationById(id: string): Promise<IntegrationRecord | null> {
      const doc = await prisma.integration.findUnique({
        where: { id },
      });
      return doc ? toIntegrationRecord(doc) : null;
    },

    async listConnections(
      integrationId: string
    ): Promise<IntegrationConnectionRecord[]> {
      const docs = await prisma.integrationConnection.findMany({
        where: { integrationId },
        orderBy: { name: 'asc' },
      });
      return docs.map(toConnectionRecord);
    },

    async getConnectionById(
      id: string
    ): Promise<IntegrationConnectionRecord | null> {
      const doc = await prisma.integrationConnection.findUnique({
        where: { id },
      });
      return doc ? toConnectionRecord(doc) : null;
    },

    async getConnectionByIdAndIntegration(
      id: string,
      integrationId: string
    ): Promise<IntegrationConnectionRecord | null> {
      const doc = await prisma.integrationConnection.findFirst({
        where: { id, integrationId },
      });
      return doc ? toConnectionRecord(doc) : null;
    },

    async createConnection(
      integrationId: string,
      input: Record<string, unknown>
    ): Promise<IntegrationConnectionRecord> {
      const data: Prisma.IntegrationConnectionCreateInput = {
        integration: { connect: { id: integrationId } },
        name: String(input['name'] || 'New Connection'),
        username: String(input['username'] || ''),
        password: String(input['password'] || ''),
        ...input,
      } as unknown as Prisma.IntegrationConnectionCreateInput;
      const doc = await prisma.integrationConnection.create({ data });
      return toConnectionRecord(doc);
    },

    async updateConnection(
      id: string,
      input: Partial<IntegrationConnectionRecord>
    ): Promise<IntegrationConnectionRecord> {
      const updateData: Record<string, unknown> = { ...input };
      delete updateData['id'];
      delete updateData['createdAt'];
      
      const doc = await prisma.integrationConnection.update({
        where: { id },
        data: updateData as unknown as Prisma.IntegrationConnectionUpdateInput,
      });
      return toConnectionRecord(doc);
    },

    async deleteConnection(
      id: string,
      options?: ConnectionDeleteOptions
    ): Promise<void> {
      const connection = await prisma.integrationConnection.findUnique({
        where: { id },
        select: { id: true, integrationId: true },
      });
      if (!connection) return;

      const integration = await prisma.integration.findUnique({
        where: { id: connection.integrationId },
        select: { slug: true },
      });
      const isBaseConnection = isBaseIntegrationSlug(integration?.slug ?? null);

      if (!isBaseConnection) {
        await cleanupPrismaConnectionReferences(id);
      } else {
        const dependencyCounts = await countPrismaConnectionDependencies(id);
        const replacementConnectionId = await resolvePrismaReplacementConnectionId({
          connectionId: id,
          integrationId: connection.integrationId,
          replacementConnectionId: options?.replacementConnectionId,
        });

        if (dependencyCounts.total > 0 && !replacementConnectionId) {
          throw conflictError(
            'Deleting this Base.com connection would orphan listing and mapping status links. Create/select another Base.com connection and retry with replacementConnectionId.',
            {
              connectionId: id,
              integrationId: connection.integrationId,
              dependencyCounts,
              replacementRequired: true,
            }
          );
        }

        if (replacementConnectionId) {
          await reassignPrismaConnectionReferences(id, replacementConnectionId);
        } else {
          await updatePrismaConnectionScopedSettings(id, null);
        }
      }

      try {
        await prisma.integrationConnection.delete({ where: { id } });
      } catch (error) {
        if (!isPrismaNotFoundError(error)) {
          throw error;
        }
      }
    },
  };
}

export function getMongoIntegrationRepository(): IntegrationRepository {
  return {
    async listIntegrations(): Promise<IntegrationRecord[]> {
      const db = await getMongoDb();
      const docs = await db
        .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
        .find()
        .sort({ name: 1 })
        .toArray();
      return docs.map(toIntegrationRecord);
    },

    async upsertIntegration(input: {
            name: string;
            slug: string;
          }): Promise<IntegrationRecord> {
      const db = await getMongoDb();
      const now = new Date();
      const res = await db
        .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
        .findOneAndUpdate(
          { slug: input.slug },
          {
            $set: { name: input.name, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true, returnDocument: 'after' }
        );
      if (!res) throw new Error('Failed to upsert integration');
      return toIntegrationRecord(res);
    },
    
    async getIntegrationById(id: string): Promise<IntegrationRecord | null> {
      const db = await getMongoDb();
      const idCandidates = toDocumentIdCandidates(id);
      const doc = await db
        .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
        .findOne({ _id: { $in: idCandidates } } as Record<string, unknown>);
      return doc ? toIntegrationRecord(doc) : null;
    },
    
    async listConnections(
      integrationId: string
    ): Promise<IntegrationConnectionRecord[]> {
      const db = await getMongoDb();
      const docs = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .find({ integrationId })
        .sort({ name: 1 })
        .toArray();
      return docs.map(doc => toConnectionRecord(doc));
    },
    
    async getConnectionById(
      id: string
    ): Promise<IntegrationConnectionRecord | null> {
      const db = await getMongoDb();
      const idCandidates = toDocumentIdCandidates(id);
      const doc = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .findOne({ _id: { $in: idCandidates } } as Record<string, unknown>);
      return doc ? toConnectionRecord(doc) : null;
    },
    
    async getConnectionByIdAndIntegration(
      id: string,
      integrationId: string
    ): Promise<IntegrationConnectionRecord | null> {
      const db = await getMongoDb();
      const idCandidates = toDocumentIdCandidates(id);
      const doc = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .findOne({
          _id: { $in: idCandidates },
          integrationId,
        } as Record<string, unknown>);
      return doc ? toConnectionRecord(doc) : null;
    },
    
    async createConnection(
      integrationId: string,
      input: Record<string, unknown>
    ): Promise<IntegrationConnectionRecord> {
      const db = await getMongoDb();
      const now = new Date();
      const doc: IntegrationConnectionDocument = {
        integrationId,
        name: String(input['name'] || 'New Connection'),
        username: String(input['username'] || ''),
        password: String(input['password'] || ''),
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      const res = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .insertOne(doc);
      return toConnectionRecord({ ...doc, _id: res.insertedId } as WithId<IntegrationConnectionDocument>);
    },
    
    async updateConnection(
      id: string,
      input: Partial<IntegrationConnectionRecord>
    ): Promise<IntegrationConnectionRecord> {
      const db = await getMongoDb();
      const now = new Date();
      const idCandidates = toDocumentIdCandidates(id);
      const updateData: Record<string, unknown> = {
        ...input,
        updatedAt: now,
      };
      delete updateData['id'];
      delete updateData['_id'];
      delete updateData['createdAt'];
    
      const res = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .findOneAndUpdate(
          { _id: { $in: idCandidates } } as Record<string, unknown>,
          { $set: updateData },
          { returnDocument: 'after' }
        );
      if (!res) throw new Error('Connection not found');
      return toConnectionRecord(res);
    },
    
    async deleteConnection(
      id: string,
      options?: ConnectionDeleteOptions
    ): Promise<void> {
      const db = await getMongoDb();
      const sourceConnectionCandidates = toDocumentIdCandidates(id);
      const sourceConnection = await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
        .findOne({
          _id: { $in: sourceConnectionCandidates },
        } as Record<string, unknown>);
      if (!sourceConnection) return;

      const integrationCandidates = toDocumentIdCandidates(
        sourceConnection.integrationId
      );
      const integration = await db
        .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
        .findOne({
          _id: { $in: integrationCandidates },
        } as Record<string, unknown>);
      const isBaseConnection = isBaseIntegrationSlug(integration?.slug ?? null);

      if (!isBaseConnection) {
        await cleanupMongoConnectionReferences(id);
        await updateMongoConnectionScopedSettings(id, null);
      } else {
        const dependencyCounts = await countMongoConnectionDependencies(id);
        const replacementConnectionId = await resolveMongoReplacementConnectionId({
          connectionId: id,
          integrationId: sourceConnection.integrationId,
          replacementConnectionId: options?.replacementConnectionId,
        });

        if (dependencyCounts.total > 0 && !replacementConnectionId) {
          throw conflictError(
            'Deleting this Base.com connection would orphan listing and mapping status links. Create/select another Base.com connection and retry with replacementConnectionId.',
            {
              connectionId: id,
              integrationId: sourceConnection.integrationId,
              dependencyCounts,
              replacementRequired: true,
            }
          );
        }

        if (replacementConnectionId) {
          await reassignMongoConnectionReferences(id, replacementConnectionId);
          await updateMongoConnectionScopedSettings(id, replacementConnectionId);
        } else {
          await updateMongoConnectionScopedSettings(id, null);
        }
      }

      await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
        .deleteMany({
          _id: { $in: sourceConnectionCandidates },
        } as Record<string, unknown>);
    },
  };
}
