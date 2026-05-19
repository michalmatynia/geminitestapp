import './load-app-env';

import type { WithId } from 'mongodb';

import type { MongoSource } from '@/shared/contracts/database';
import { getMongoDb, invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';
import {
  AI_BRAIN_ROUTING_COLLECTION,
  AI_BRAIN_ROUTING_GLOBAL_ID,
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  type AiBrainSettings,
} from '@/shared/lib/ai-brain/settings';

const SETTINGS_COLLECTION = 'settings';

type SettingDoc = {
  _id: string;
  key?: string;
  value?: string;
};

type RoutingDoc = {
  _id: string;
  key?: string;
  schemaVersion?: number;
  settings?: unknown;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const shouldCleanupLegacy = args.has('--cleanup-legacy');
const sourceArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--source='))
  ?.slice('--source='.length);
const preferredSource: MongoSource | undefined =
  sourceArg === 'local' || sourceArg === 'cloud' ? sourceArg : undefined;

if (sourceArg !== undefined && preferredSource === undefined) {
  throw new Error('Invalid --source value. Expected "local" or "cloud".');
}

const removeNullRoutingRecordValues = (payload: Record<string, unknown>): Record<string, unknown> => {
  const copy: Record<string, unknown> = { ...payload };
  ['assignments', 'capabilities'].forEach((key) => {
    const record = copy[key];
    if (record === null || typeof record !== 'object' || Array.isArray(record)) return;
    copy[key] = Object.fromEntries(
      Object.entries(record as Record<string, unknown>).filter(([, value]) => value !== null)
    );
  });
  return copy;
};

const toJsonSafeSettingsPayload = (settings: AiBrainSettings): AiBrainSettings =>
  removeNullRoutingRecordValues(
    JSON.parse(JSON.stringify(settings)) as Record<string, unknown>
  ) as AiBrainSettings;

const readLegacySettingsDocument = async (): Promise<WithId<SettingDoc> | null> => {
  const mongo = await getMongoDb(preferredSource);
  return await mongo.collection<SettingDoc>(SETTINGS_COLLECTION).findOne({
    $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
  });
};

const readRoutingDocument = async (): Promise<WithId<RoutingDoc> | null> => {
  const mongo = await getMongoDb(preferredSource);
  return await mongo.collection<RoutingDoc>(AI_BRAIN_ROUTING_COLLECTION).findOne({
    _id: AI_BRAIN_ROUTING_GLOBAL_ID,
  });
};

const parseRoutingDocumentSettings = (document: RoutingDoc | null): AiBrainSettings | null => {
  if (!document) return null;
  const raw = document.settings ?? document.value ?? null;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') return parseBrainSettings(raw);
  return parseBrainSettings(JSON.stringify(removeNullRoutingRecordValues(
    JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
  )));
};

const writeRoutingSettings = async (settings: AiBrainSettings): Promise<void> => {
  const mongo = await getMongoDb(preferredSource);
  const now = new Date();
  await mongo.collection<RoutingDoc>(AI_BRAIN_ROUTING_COLLECTION).updateOne(
    { _id: AI_BRAIN_ROUTING_GLOBAL_ID },
    {
      $set: {
        key: AI_BRAIN_ROUTING_GLOBAL_ID,
        schemaVersion: 1,
        settings: toJsonSafeSettingsPayload(settings),
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const cleanupLegacySettings = async (): Promise<number> => {
  const mongo = await getMongoDb(preferredSource);
  const result = await mongo.collection<SettingDoc>(SETTINGS_COLLECTION).deleteMany({
    $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
  });
  return result.deletedCount ?? 0;
};

const run = async (): Promise<void> => {
  const legacyDocument = await readLegacySettingsDocument();
  const routingDocument = await readRoutingDocument();
  const legacySettings = legacyDocument?.value ? parseBrainSettings(legacyDocument.value) : null;
  const existingRoutingSettings = parseRoutingDocumentSettings(routingDocument);
  const rawTargetSettingsJson = JSON.stringify(routingDocument?.settings ?? null);
  const cleanedTargetSettingsJson =
    existingRoutingSettings === null
      ? null
      : JSON.stringify(toJsonSafeSettingsPayload(existingRoutingSettings));
  const shouldWriteRouting = legacySettings !== null && existingRoutingSettings === null;
  const shouldOverwriteRouting =
    legacySettings !== null &&
    existingRoutingSettings !== null &&
    JSON.stringify(legacySettings) !== JSON.stringify(existingRoutingSettings);
  const shouldCleanTarget =
    existingRoutingSettings !== null && rawTargetSettingsJson !== cleanedTargetSettingsJson;
  let deletedLegacySettings = 0;

  if (shouldApply && legacySettings !== null) {
    await writeRoutingSettings(legacySettings);
  } else if (shouldApply && shouldCleanTarget && existingRoutingSettings !== null) {
    await writeRoutingSettings(existingRoutingSettings);
  }

  if (shouldApply && shouldCleanupLegacy && legacyDocument !== null) {
    deletedLegacySettings = await cleanupLegacySettings();
  }

  const routingAfter = await readRoutingDocument();
  const legacyAfter = await readLegacySettingsDocument();

  console.log(
    JSON.stringify(
      {
        mode: shouldApply ? 'apply' : 'dry-run',
        source: preferredSource ?? 'active-default',
        sourceCollection: SETTINGS_COLLECTION,
        targetCollection: AI_BRAIN_ROUTING_COLLECTION,
        legacyFound: legacyDocument !== null,
        targetFoundBefore: routingDocument !== null,
        targetFoundAfter: routingAfter !== null,
        plannedWrite: shouldWriteRouting || shouldOverwriteRouting || shouldCleanTarget,
        plannedOverwrite: shouldOverwriteRouting,
        plannedTargetCleanup: shouldCleanTarget,
        cleanupLegacyRequested: shouldCleanupLegacy,
        deletedLegacySettings,
        legacyRemainingAfter: legacyAfter !== null,
      },
      null,
      2
    )
  );
};

try {
  await run();
} finally {
  await invalidateMongoClientCache();
}
