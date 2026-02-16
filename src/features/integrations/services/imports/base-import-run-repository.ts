import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import type {
  BaseImportItemRecord,
  BaseImportRunDetailResponse,
  BaseImportRunParams,
  BaseImportRunRecord,
  BaseImportRunStats,
  BaseImportRunStatus,
  BaseImportPreflight,
} from '@/features/integrations/types/base-import-runs';
import { getProductDataProvider } from '@/features/products/server';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Filter } from 'mongodb';

const RUN_KEY_PREFIX = 'base_import_run:';
const ITEM_KEY_PREFIX = 'base_import_run_item:';
const LIST_LIMIT_DEFAULT = 50;

type StorageProvider = 'mongodb' | 'prisma';

type SettingDoc = {
  _id: string | ObjectId;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const resolveProvider = async (): Promise<StorageProvider> => {
  const provider = await getProductDataProvider();
  return provider as StorageProvider;
};

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const nowIso = (): string => new Date().toISOString();

const runKey = (runId: string): string => `${RUN_KEY_PREFIX}${runId}`;

const itemKey = (runId: string, itemId: string): string =>
  `${ITEM_KEY_PREFIX}${runId}:${itemId}`;

const parseJson = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = await resolveProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(key) }, { key }],
    } as Filter<SettingDoc>);
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeSettingValue = async (key: string, value: string): Promise<void> => {
  const provider = await resolveProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      { $or: [{ _id: toMongoId(key) }, { key }] } as Filter<SettingDoc>,
      {
        $set: {
          key,
          value,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: key,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
};

const deleteSettingByKey = async (key: string): Promise<void> => {
  const provider = await resolveProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').deleteMany({
      $or: [{ _id: toMongoId(key) }, { key }],
    } as Filter<SettingDoc>);
    return;
  }
  await prisma.setting.deleteMany({
    where: { key },
  });
};

const listSettingValuesByPrefix = async (
  prefix: string,
  take = LIST_LIMIT_DEFAULT
): Promise<string[]> => {
  const provider = await resolveProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const docs = await mongo
      .collection<SettingDoc>('settings')
      .find({ key: { $regex: regex } } as Filter<SettingDoc>)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(Math.max(1, take))
      .toArray();
    return docs
      .map((doc: SettingDoc) => (typeof doc.value === 'string' ? doc.value : null))
      .filter((value: string | null): value is string => Boolean(value));
  }

  const rows = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: prefix,
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(1, take),
    select: { value: true },
  });
  return rows
    .map((row: { value: string }) => row.value)
    .filter((value: string) => value.trim().length > 0);
};

const initialStats = (total = 0): BaseImportRunStats => ({
  total,
  pending: total,
  processing: 0,
  imported: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
});

export const createBaseImportRun = async (input: {
  params: BaseImportRunParams;
  preflight: BaseImportPreflight;
  idempotencyKey?: string | null;
  totalItems?: number;
  summaryMessage?: string | null;
}): Promise<BaseImportRunRecord> => {
  const timestamp = nowIso();
  const record: BaseImportRunRecord = {
    id: randomUUID(),
    status: input.preflight.ok ? 'queued' : 'failed',
    params: input.params,
    idempotencyKey: input.idempotencyKey ?? null,
    preflight: input.preflight,
    stats: initialStats(input.totalItems ?? 0),
    startedAt: null,
    finishedAt: input.preflight.ok ? null : timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    summaryMessage: input.summaryMessage ?? null,
  };
  await writeSettingValue(runKey(record.id), JSON.stringify(record));
  return record;
};

export const getBaseImportRun = async (
  runId: string
): Promise<BaseImportRunRecord | null> => {
  const raw = await readSettingValue(runKey(runId));
  return parseJson<BaseImportRunRecord>(raw);
};

export const updateBaseImportRun = async (
  runId: string,
  patch: Partial<BaseImportRunRecord>
): Promise<BaseImportRunRecord> => {
  const existing = await getBaseImportRun(runId);
  if (!existing) {
    throw new Error(`Base import run not found: ${runId}`);
  }
  const merged: BaseImportRunRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: nowIso(),
  };
  await writeSettingValue(runKey(runId), JSON.stringify(merged));
  return merged;
};

export const listBaseImportRuns = async (
  limit = LIST_LIMIT_DEFAULT
): Promise<BaseImportRunRecord[]> => {
  const values = await listSettingValuesByPrefix(RUN_KEY_PREFIX, limit);
  return values
    .map((value: string) => parseJson<BaseImportRunRecord>(value))
    .filter(
      (record: BaseImportRunRecord | null): record is BaseImportRunRecord =>
        Boolean(record)
    );
};

export const putBaseImportRunItem = async (
  item: BaseImportItemRecord
): Promise<BaseImportItemRecord> => {
  const normalized: BaseImportItemRecord = {
    ...item,
    updatedAt: nowIso(),
  };
  await writeSettingValue(
    itemKey(item.runId, item.itemId),
    JSON.stringify(normalized)
  );
  return normalized;
};

export const updateBaseImportRunItem = async (
  runId: string,
  itemId: string,
  patch: Partial<BaseImportItemRecord>
): Promise<BaseImportItemRecord> => {
  const existing = await getBaseImportRunItem(runId, itemId);
  if (!existing) {
    throw new Error(`Base import run item not found: ${runId}/${itemId}`);
  }
  const merged: BaseImportItemRecord = {
    ...existing,
    ...patch,
    runId: existing.runId,
    itemId: existing.itemId,
    idempotencyKey: existing.idempotencyKey,
    updatedAt: nowIso(),
  };
  await writeSettingValue(itemKey(runId, itemId), JSON.stringify(merged));
  return merged;
};

export const getBaseImportRunItem = async (
  runId: string,
  itemId: string
): Promise<BaseImportItemRecord | null> => {
  const raw = await readSettingValue(itemKey(runId, itemId));
  return parseJson<BaseImportItemRecord>(raw);
};

export const listBaseImportRunItems = async (
  runId: string,
  limit = 10_000
): Promise<BaseImportItemRecord[]> => {
  const values = await listSettingValuesByPrefix(`${ITEM_KEY_PREFIX}${runId}:`, limit);
  return values
    .map((value: string) => parseJson<BaseImportItemRecord>(value))
    .filter(
      (item: BaseImportItemRecord | null): item is BaseImportItemRecord =>
        Boolean(item)
    )
    .sort((a: BaseImportItemRecord, b: BaseImportItemRecord) =>
      a.itemId.localeCompare(b.itemId)
    );
};

export const deleteBaseImportRunItems = async (runId: string): Promise<void> => {
  const items = await listBaseImportRunItems(runId);
  await Promise.all(
    items.map((item: BaseImportItemRecord) =>
      deleteSettingByKey(itemKey(runId, item.itemId))
    )
  );
};

export const computeBaseImportRunStats = (
  items: BaseImportItemRecord[]
): BaseImportRunStats => {
  const stats: BaseImportRunStats = initialStats(items.length);
  for (const item of items) {
    if (item.status === 'processing') stats.processing += 1;
    if (item.status === 'imported') stats.imported += 1;
    if (item.status === 'updated') stats.updated += 1;
    if (item.status === 'skipped') stats.skipped += 1;
    if (item.status === 'failed') stats.failed += 1;
  }
  stats.pending = Math.max(
    0,
    stats.total - stats.processing - stats.imported - stats.updated - stats.skipped - stats.failed
  );
  return stats;
};

export const recomputeBaseImportRunStats = async (
  runId: string
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw new Error(`Base import run not found: ${runId}`);
  }
  const items = await listBaseImportRunItems(runId);
  const stats = computeBaseImportRunStats(items);
  return updateBaseImportRun(runId, { stats });
};

export const getBaseImportRunDetail = async (
  runId: string
): Promise<BaseImportRunDetailResponse | null> => {
  const run = await getBaseImportRun(runId);
  if (!run) return null;
  const items = await listBaseImportRunItems(runId);
  return { run, items };
};

export const updateBaseImportRunStatus = async (
  runId: string,
  status: BaseImportRunStatus,
  patch?: Partial<BaseImportRunRecord>
): Promise<BaseImportRunRecord> => {
  const now = nowIso();
  const basePatch: Partial<BaseImportRunRecord> = {
    status,
    ...(status === 'running' ? { startedAt: patch?.startedAt ?? now } : {}),
    ...(status === 'completed' || status === 'failed' || status === 'canceled'
      ? { finishedAt: patch?.finishedAt ?? now }
      : {}),
  };
  return updateBaseImportRun(runId, { ...basePatch, ...(patch ?? {}) });
};
