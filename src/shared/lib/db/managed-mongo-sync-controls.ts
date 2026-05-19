import 'server-only';

import type { DatabaseEngineManagedMongoApplication } from '@/shared/contracts/database';
import { databaseEngineManagedMongoApplicationSchema } from '@/shared/contracts/database';
import { DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY } from '@/shared/lib/db/database-engine-constants';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

export type ManagedMongoSyncControl = {
  disabled: boolean;
  reason: string | null;
  updatedAt: string | null;
};

export type ManagedMongoSyncControls = Partial<
  Record<DatabaseEngineManagedMongoApplication, ManagedMongoSyncControl>
>;

type ManagedMongoSyncControlSettingDoc = {
  _id: string;
  key?: string;
  value?: string;
  createdAt?: string;
  updatedAt?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readApplicationsPayload = (parsed: unknown): unknown => {
  if (!isRecord(parsed)) return parsed;
  const applications = parsed['applications'];
  return isRecord(applications) ? applications : parsed;
};

const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseRawControls = (raw: unknown): ManagedMongoSyncControls => {
  if (typeof raw !== 'string' || raw.trim() === '') return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    // Extract 'applications' sub-object to support both flat and nested JSON structures from settings.
    const rawApplications = readApplicationsPayload(parsed);
    if (!isRecord(rawApplications)) return {};

    const controls: ManagedMongoSyncControls = {};
    for (const [application, value] of Object.entries(rawApplications)) {
      // Validate application name against schema; skip invalid entries to prevent misconfiguration.
      const parsedApplication = databaseEngineManagedMongoApplicationSchema.safeParse(application);
      if (!parsedApplication.success || !isRecord(value)) continue;

      // Extract only known control fields and apply type coercion for booleans and optional strings.
      controls[parsedApplication.data] = {
        disabled: value['disabled'] === true,
        reason: readOptionalString(value['reason']),
        updatedAt: readOptionalString(value['updatedAt']),
      };
    }
    return controls;
  } catch {
    return {};
  }
};

const serializeControls = (controls: ManagedMongoSyncControls): string =>
  JSON.stringify({ applications: controls });

export const getManagedMongoSyncControls = async (): Promise<ManagedMongoSyncControls> => {
  await applyActiveMongoSourceEnv();
  if ((process.env['MONGODB_URI'] ?? '').trim() === '') return {};

  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<ManagedMongoSyncControlSettingDoc>('settings')
      .findOne({
        $or: [
          { _id: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY },
          { key: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY },
        ],
      });
    return parseRawControls(doc?.value);
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.managed-mongo-sync-controls',
      action: 'getManagedMongoSyncControls',
      settingKey: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY,
    });
    return {};
  }
};

export const getManagedMongoApplicationSyncControl = (
  controls: ManagedMongoSyncControls,
  application: DatabaseEngineManagedMongoApplication
): ManagedMongoSyncControl => ({
  disabled: controls[application]?.disabled === true,
  reason: controls[application]?.reason ?? null,
  updatedAt: controls[application]?.updatedAt ?? null,
});

export const setManagedMongoApplicationSyncDisabled = async (
  application: DatabaseEngineManagedMongoApplication,
  disabled: boolean,
  reason?: string | null
): Promise<ManagedMongoSyncControl> => {
  await applyActiveMongoSourceEnv();
  const mongo = await getMongoDb();
  const controls = await getManagedMongoSyncControls();
  const updatedAt = new Date().toISOString();
  const trimmedReason = readOptionalString(reason);
  // Provide a default reason when disabling sync without explicit reason; supply null when enabling.
  const fallbackReason = disabled ? 'Temporarily disabled from Database Engine.' : null;
  const nextControl: ManagedMongoSyncControl = {
    disabled,
    reason: trimmedReason ?? fallbackReason,
    updatedAt,
  };
  const nextControls: ManagedMongoSyncControls = {
    ...controls,
    [application]: nextControl,
  };

  const settings = mongo.collection<ManagedMongoSyncControlSettingDoc>('settings');
  // Find existing document to preserve its _id and creation metadata if present.
  const existing = await settings.findOne({
    $or: [
      { _id: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY },
      { key: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY },
    ],
  });

  // Upsert uses existing _id if found, otherwise creates new document; $setOnInsert ensures createdAt only on insert.
  await settings.updateOne(
    existing?._id !== undefined
      ? { _id: existing._id }
      : { _id: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY },
    {
      $set: {
        key: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY,
        value: serializeControls(nextControls),
        updatedAt,
      },
      $setOnInsert: {
        _id: DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY,
        createdAt: updatedAt,
      },
    },
    { upsert: true }
  );

  return nextControl;
};
