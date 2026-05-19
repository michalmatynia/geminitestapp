import 'server-only';

import type { WithId } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  AI_BRAIN_ROUTING_COLLECTION,
  AI_BRAIN_ROUTING_GLOBAL_ID,
  parseBrainSettings,
  type AiBrainSettings,
} from '../settings';

type BrainRoutingDocument = {
  _id: string;
  key?: string;
  schemaVersion?: number;
  settings?: unknown;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BrainRoutingReadResult = {
  settings: AiBrainSettings;
  configured: boolean;
  updatedAt: string | null;
};

let cachedBrainRouting: BrainRoutingReadResult | null = null;
let lastBrainRoutingFetchAt = 0;
const BRAIN_ROUTING_TTL_MS = 30000;

const hasMongoUri = (): boolean => (process.env['MONGODB_URI'] ?? '').trim().length > 0;

export const invalidateBrainRoutingCache = (): void => {
  cachedBrainRouting = null;
  lastBrainRoutingFetchAt = 0;
};

const setBrainRoutingCache = (result: BrainRoutingReadResult, fetchedAt: number): void => {
  cachedBrainRouting = result;
  lastBrainRoutingFetchAt = fetchedAt;
};

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

const toJsonSafeSettingsPayload = (settings: unknown): unknown => {
  if (settings === null || settings === undefined || typeof settings !== 'object') {
    return settings;
  }
  return removeNullRoutingRecordValues(
    JSON.parse(JSON.stringify(settings)) as Record<string, unknown>
  );
};

const normalizeBrainSettings = (settings: unknown): AiBrainSettings => {
  if (settings === null || settings === undefined) return parseBrainSettings(null);
  if (typeof settings === 'string') return parseBrainSettings(settings);
  return parseBrainSettings(JSON.stringify(toJsonSafeSettingsPayload(settings)));
};

const cloneDefaultBrainSettings = (): AiBrainSettings => parseBrainSettings(null);

const toUpdatedAt = (value: Date | string | undefined): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const fromDocument = (
  document: WithId<BrainRoutingDocument> | null
): BrainRoutingReadResult => {
  if (!document) {
    return {
      settings: cloneDefaultBrainSettings(),
      configured: false,
      updatedAt: null,
    };
  }

  const rawSettings = document.settings ?? document.value ?? null;
  return {
    settings: normalizeBrainSettings(rawSettings),
    configured: true,
    updatedAt: toUpdatedAt(document.updatedAt),
  };
};

const readBrainRoutingDocument = async (): Promise<BrainRoutingReadResult> => {
  if (!hasMongoUri()) {
    return {
      settings: cloneDefaultBrainSettings(),
      configured: false,
      updatedAt: null,
    };
  }

  const mongo = await getMongoDb();
  const document = await mongo.collection<BrainRoutingDocument>(AI_BRAIN_ROUTING_COLLECTION).findOne({
    _id: AI_BRAIN_ROUTING_GLOBAL_ID,
  });
  return fromDocument(document);
};

export const readBrainRoutingSettings = async (): Promise<BrainRoutingReadResult> => {
  const now = Date.now();
  if (cachedBrainRouting !== null && now - lastBrainRoutingFetchAt < BRAIN_ROUTING_TTL_MS) {
    return cachedBrainRouting;
  }

  try {
    const result = await readBrainRoutingDocument();
    setBrainRoutingCache(result, now);
    return result;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-brain.routing',
      action: 'readBrainRoutingSettings',
      collection: AI_BRAIN_ROUTING_COLLECTION,
    });
    return {
      settings: cloneDefaultBrainSettings(),
      configured: false,
      updatedAt: null,
    };
  }
};

export const upsertBrainRoutingSettings = async (
  settings: AiBrainSettings
): Promise<boolean> => {
  try {
    const normalized = normalizeBrainSettings(settings);
    if (!hasMongoUri()) return false;
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo.collection<BrainRoutingDocument>(AI_BRAIN_ROUTING_COLLECTION).updateOne(
      { _id: AI_BRAIN_ROUTING_GLOBAL_ID },
      {
        $set: {
          key: AI_BRAIN_ROUTING_GLOBAL_ID,
          schemaVersion: 1,
          settings: toJsonSafeSettingsPayload(normalized),
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
    setBrainRoutingCache(
      {
        settings: normalized,
        configured: true,
        updatedAt: now.toISOString(),
      },
      Date.now()
    );
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-brain.routing',
      action: 'upsertBrainRoutingSettings',
      collection: AI_BRAIN_ROUTING_COLLECTION,
    });
    return false;
  }
};

export const deleteBrainRoutingSettings = async (): Promise<boolean> => {
  try {
    if (!hasMongoUri()) return false;
    const mongo = await getMongoDb();
    await mongo.collection<BrainRoutingDocument>(AI_BRAIN_ROUTING_COLLECTION).deleteOne({
      _id: AI_BRAIN_ROUTING_GLOBAL_ID,
    });
    invalidateBrainRoutingCache();
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-brain.routing',
      action: 'deleteBrainRoutingSettings',
      collection: AI_BRAIN_ROUTING_COLLECTION,
    });
    return false;
  }
};
