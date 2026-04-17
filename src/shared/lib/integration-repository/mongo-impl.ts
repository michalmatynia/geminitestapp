import { type ObjectId, type WithId, type Filter, type Document } from 'mongodb';

import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isBaseIntegrationSlug, isPlaywrightProgrammableSlug } from '@/shared/lib/integration-slugs';

import {
  INTEGRATION_COLLECTION,
  INTEGRATION_CONNECTION_COLLECTION,
  DEFAULT_CONNECTION_SETTING_KEY,
  ACTIVE_TEMPLATE_SETTING_KEY,
  PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
  toDocumentIdCandidates,
  toConnectionIdCandidates,
  stripActiveTemplateScopesForConnection,
  remapProductSyncProfilesSetting,
  withDependencyTotal,
  normalizeOptionalConnectionId,
  stripProgrammableConnectionBrowserPersistenceFields,
  buildProgrammableConnectionBrowserFieldsUnsetDocument,
  toIntegrationRecord,
  toConnectionRecord,
  type ConnectionDeleteOptions,
  type ConnectionDependencyCounts,
} from './common';
import type {
  IntegrationConnectionRecord,
  IntegrationConnectionUpdateInput,
  IntegrationRecord,
  IntegrationRepository,
} from '@/shared/contracts/integration-storage';

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
  traderaBrowserMode?: 'builtin' | 'scripted';
  traderaCategoryStrategy?: 'mapper' | 'top_suggested';
  playwrightStorageState?: string | null;
  playwrightStorageStateUpdatedAt?: Date | null;
  playwrightHeadless?: boolean;
  playwrightSlowMo?: number;
  playwrightTimeout?: number;
  playwrightNavigationTimeout?: number;
  playwrightLocale?: string;
  playwrightTimezoneId?: string;
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
  playwrightProxySessionAffinity?: boolean;
  playwrightProxySessionMode?: string;
  playwrightProxyProviderPreset?: string;
  playwrightBrowser?: string;
  playwrightIdentityProfile?: string;
  playwrightEmulateDevice?: boolean;
  playwrightDeviceName?: string;
  playwrightPersonaId?: string | null;
  playwrightListingScript?: string | null;
  playwrightImportScript?: string | null;
  playwrightImportBaseUrl?: string | null;
  playwrightImportCaptureRoutesJson?: string | null;
  playwrightFieldMapperJson?: string | null;
  scanner1688StartUrl?: string | null;
  scanner1688LoginMode?: 'session_required' | 'manual_login';
  scanner1688DefaultSearchMode?: 'local_image' | 'image_url_fallback';
  scanner1688CandidateResultLimit?: number | null;
  scanner1688MinimumCandidateScore?: number | null;
  scanner1688MaxExtractedImages?: number | null;
  scanner1688AllowUrlImageSearchFallback?: boolean | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: Date | null;
  allegroTokenUpdatedAt?: Date | null;
  allegroUseSandbox?: boolean;
  linkedinAccessToken?: string | null;
  linkedinRefreshToken?: string | null;
  linkedinTokenType?: string | null;
  linkedinScope?: string | null;
  linkedinExpiresAt?: Date | null;
  linkedinTokenUpdatedAt?: Date | null;
  linkedinPersonUrn?: string | null;
  linkedinProfileUrl?: string | null;
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
  traderaParameterMapperRulesJson?: string | null;
  traderaParameterMapperCatalogJson?: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

const countMongoConnectionDependencies = async (
  connectionId: string
): Promise<ConnectionDependencyCounts> => {
  const db = await getMongoDb();
  const candidates = toConnectionIdCandidates(connectionId);
  const filter = {
    _id: {
      $in: candidates.asDocumentIds,
    },
  } as Filter<Document>;

  const [
    productListings,
    categoryMappings,
    externalCategories,
    producerMappings,
    externalProducers,
    tagMappings,
    externalTags,
  ] = await Promise.all([
    db.collection('product_listings').countDocuments(filter),
    db.collection('category_mappings').countDocuments(filter),
    db.collection('external_categories').countDocuments(filter),
    db.collection('producer_mappings').countDocuments(filter),
    db.collection('external_producers').countDocuments(filter),
    db.collection('tag_mappings').countDocuments(filter),
    db.collection('external_tags').countDocuments(filter),
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
  } as Filter<Document>;

  await Promise.all([
    db.collection('product_listings').deleteMany(filter),
    db.collection('category_mappings').deleteMany(filter),
    db.collection('external_categories').deleteMany(filter),
    db.collection('producer_mappings').deleteMany(filter),
    db.collection('external_producers').deleteMany(filter),
    db.collection('tag_mappings').deleteMany(filter),
    db.collection('external_tags').deleteMany(filter),
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
  } as Filter<Document>;

  await Promise.all([
    db.collection('product_listings').updateMany(filter, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('category_mappings').updateMany(filter, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('external_categories').updateMany(filter, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('producer_mappings').updateMany(filter, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('external_producers').updateMany(filter, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('tag_mappings').updateMany(filter, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
    db.collection('external_tags').updateMany(filter, {
      $set: { connectionId: replacementConnectionId, updatedAt: new Date() },
    }),
  ]);
};

const updateMongoConnectionScopedSettings = async (
  connectionId: string,
  replacementConnectionId: string | null
): Promise<void> => {
  const db = await getMongoDb();
  const settings = db.collection<{
    _id: string | ObjectId;
    key?: string;
    value?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>('settings');
  const [defaultConnectionSetting, activeTemplateSetting, syncProfilesSetting] = await Promise.all([
    settings.findOne({
      $or: [{ _id: DEFAULT_CONNECTION_SETTING_KEY }, { key: DEFAULT_CONNECTION_SETTING_KEY }],
    }),
    settings.findOne({
      $or: [{ _id: ACTIVE_TEMPLATE_SETTING_KEY }, { key: ACTIVE_TEMPLATE_SETTING_KEY }],
    }),
    settings.findOne({
      $or: [{ _id: PRODUCT_SYNC_PROFILE_SETTINGS_KEY }, { key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY }],
    }),
  ]);

  if (defaultConnectionSetting?.value?.trim() === connectionId) {
    await settings.updateMany(
      {
        $or: [{ _id: DEFAULT_CONNECTION_SETTING_KEY }, { key: DEFAULT_CONNECTION_SETTING_KEY }],
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
        $or: [{ _id: ACTIVE_TEMPLATE_SETTING_KEY }, { key: ACTIVE_TEMPLATE_SETTING_KEY }],
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
  const requestedReplacementId = normalizeOptionalConnectionId(input.replacementConnectionId);
  if (requestedReplacementId) {
    if (requestedReplacementId === input.connectionId) {
      throw badRequestError(
        'Replacement connection must be different from the deleted connection.'
      );
    }

    const replacementCandidates = toDocumentIdCandidates(requestedReplacementId);
    const replacement = await db
      .collection<{
        _id: string | ObjectId;
        integrationId: string;
      }>(INTEGRATION_CONNECTION_COLLECTION)
      .findOne({
        _id: { $in: replacementCandidates },
        integrationId: input.integrationId,
      } as Record<string, unknown>);
    if (!replacement) {
      throw badRequestError('Replacement connection does not exist in this integration.', {
        replacementConnectionId: requestedReplacementId,
        integrationId: input.integrationId,
      });
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

const isProgrammableIntegrationId = async (
  db: Awaited<ReturnType<typeof getMongoDb>>,
  integrationId: string
): Promise<boolean> => {
  const integration = await db
    .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
    .findOne({
      _id: { $in: toDocumentIdCandidates(integrationId) },
    } as Record<string, unknown>);

  return isPlaywrightProgrammableSlug(integration?.slug ?? null);
};

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

    async upsertIntegration(input: { name: string; slug: string }): Promise<IntegrationRecord> {
      const db = await getMongoDb();
      const now = new Date();
      const res = await db.collection<IntegrationDocument>(INTEGRATION_COLLECTION).findOneAndUpdate(
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

    async listConnections(integrationId: string): Promise<IntegrationConnectionRecord[]> {
      const db = await getMongoDb();
      const docs = await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
        .find({ integrationId })
        .sort({ name: 1 })
        .toArray();
      return docs.map((doc) => toConnectionRecord(doc));
    },

    async getConnectionById(id: string): Promise<IntegrationConnectionRecord | null> {
      const db = await getMongoDb();
      const idCandidates = toDocumentIdCandidates(id);
      const doc = await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
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
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
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
      const sanitizedInput = (await isProgrammableIntegrationId(db, integrationId))
        ? stripProgrammableConnectionBrowserPersistenceFields(input)
        : { ...input };
      const doc: IntegrationConnectionDocument = {
        integrationId,
        name: String(sanitizedInput['name'] || 'New Connection'),
        username: String(sanitizedInput['username'] || ''),
        password: String(sanitizedInput['password'] || ''),
        ...sanitizedInput,
        createdAt: now,
        updatedAt: now,
      };
      const res = await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
        .insertOne(doc);
      return toConnectionRecord({
        ...doc,
        _id: res.insertedId,
      } as WithId<IntegrationConnectionDocument>);
    },

    async updateConnection(
      id: string,
      input: IntegrationConnectionUpdateInput
    ): Promise<IntegrationConnectionRecord> {
      const db = await getMongoDb();
      const now = new Date();
      const idCandidates = toDocumentIdCandidates(id);
      const current = await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
        .findOne({ _id: { $in: idCandidates } } as Record<string, unknown>);
      if (!current) throw new Error('Connection not found');
      const isProgrammable = await isProgrammableIntegrationId(db, current.integrationId);
      const updateData: Record<string, unknown> = {
        ...input,
        updatedAt: now,
      };
      const shouldResetProgrammableBrowserFields =
        isProgrammable && updateData['resetPlaywrightOverrides'] === true;
      delete updateData['id'];
      delete updateData['_id'];
      delete updateData['createdAt'];
      delete updateData['resetPlaywrightOverrides'];

      const sanitizedUpdateData = isProgrammable
        ? stripProgrammableConnectionBrowserPersistenceFields(updateData)
        : updateData;
      const updateOperation: Record<string, unknown> = {
        $set: sanitizedUpdateData,
      };
      if (shouldResetProgrammableBrowserFields) {
        updateOperation['$unset'] = buildProgrammableConnectionBrowserFieldsUnsetDocument();
      }

      const res = await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
        .findOneAndUpdate(
          { _id: { $in: idCandidates } } as Record<string, unknown>,
          updateOperation,
          { returnDocument: 'after' }
        );
      if (!res) throw new Error('Connection not found');
      return toConnectionRecord(res);
    },

    async deleteConnection(id: string, options?: ConnectionDeleteOptions): Promise<void> {
      const db = await getMongoDb();
      const sourceConnectionCandidates = toDocumentIdCandidates(id);
      const sourceConnection = await db
        .collection<IntegrationConnectionDocument>(INTEGRATION_CONNECTION_COLLECTION)
        .findOne({
          _id: { $in: sourceConnectionCandidates },
        } as Record<string, unknown>);
      if (!sourceConnection) return;

      const integrationCandidates = toDocumentIdCandidates(sourceConnection.integrationId);
      const integration = await db.collection<IntegrationDocument>(INTEGRATION_COLLECTION).findOne({
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
