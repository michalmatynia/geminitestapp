import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import {
  DEFAULT_PRODUCT_SYNC_FIELD_RULES,
  PRODUCT_SYNC_APP_FIELDS,
  PRODUCT_SYNC_PROFILE_SETTINGS_KEY as PROFILE_SETTINGS_KEY,
  PRODUCT_SYNC_RUN_KEY_PREFIX as RUN_KEY_PREFIX,
  PRODUCT_SYNC_ITEM_KEY_PREFIX as ITEM_KEY_PREFIX,
} from '@/shared/contracts/product-sync';
import type {
  ProductSyncAppField,
  ProductSyncConflictPolicy,
  ProductSyncFieldRule,
  ProductSyncProfile,
  ProductSyncRunDetail,
  ProductSyncRunItemRecord,
  ProductSyncRunRecord,
  ProductSyncRunStats,
  ProductSyncRunStatus,
  ProductSyncRunTrigger,
} from '@/shared/contracts/product-sync';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Filter } from 'mongodb';

const ITEM_LIMIT_HARD = 100_000;
const MAX_RUN_SCAN_LIMIT = 2_000;
const STALE_QUEUED_DEFAULT_MS = 20 * 60 * 1000;
const STALE_RUNNING_DEFAULT_MS = 2 * 60 * 60 * 1000;
const RUN_HISTORY_KEEP_DEFAULT = 150;

type StorageProvider = 'mongodb' | 'prisma';

type SettingDoc = {
  _id: string | ObjectId;
  key?: string;
  value?: string;
  updatedAt?: Date;
  createdAt?: Date;
};

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const resolveProvider = async (): Promise<StorageProvider> => {
  const provider = await getProductDataProvider();
  return provider as StorageProvider;
};

const nowIso = (): string => new Date().toISOString();

const toTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toBoundedInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const PRODUCT_SYNC_STALE_QUEUED_MS = toBoundedInt(
  process.env['PRODUCT_SYNC_STALE_QUEUED_MS'],
  STALE_QUEUED_DEFAULT_MS,
  60_000,
  24 * 60 * 60 * 1000
);
const PRODUCT_SYNC_STALE_RUNNING_MS = toBoundedInt(
  process.env['PRODUCT_SYNC_STALE_RUNNING_MS'],
  STALE_RUNNING_DEFAULT_MS,
  5 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000
);
const PRODUCT_SYNC_RUN_HISTORY_KEEP = toBoundedInt(
  process.env['PRODUCT_SYNC_RUN_HISTORY_KEEP'],
  RUN_HISTORY_KEEP_DEFAULT,
  10,
  MAX_RUN_SCAN_LIMIT
);

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

  await prisma.setting.deleteMany({ where: { key } });
};

const listSettingValuesByPrefix = async (prefix: string, take: number): Promise<string[]> => {
  const safeTake = Math.max(1, take);
  const provider = await resolveProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const docs = await mongo
      .collection<SettingDoc>('settings')
      .find({ key: { $regex: regex } } as Filter<SettingDoc>)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(safeTake)
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
    take: safeTake,
    select: { value: true },
  });

  return rows
    .map((row: { value: string }) => row.value)
    .filter((value: string) => value.trim().length > 0);
};

const parseJson = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const isValidAppField = (value: unknown): value is ProductSyncAppField =>
  typeof value === 'string' && (PRODUCT_SYNC_APP_FIELDS as string[]).includes(value);

const normalizeFieldRules = (rules: unknown): ProductSyncFieldRule[] => {
  const items = Array.isArray(rules) ? rules : [];
  const normalized = items
    .map((entry: unknown): ProductSyncFieldRule | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      if (!isValidAppField(record['appField'])) return null;
      const direction = toTrimmedString(record['direction']);
      if (direction !== 'disabled' && direction !== 'base_to_app' && direction !== 'app_to_base') {
        return null;
      }
      const baseField = toTrimmedString(record['baseField']);
      if (!baseField) return null;
      return {
        id: toTrimmedString(record['id']) || randomUUID(),
        appField: record['appField'],
        baseField,
        direction,
      };
    })
    .filter((entry: ProductSyncFieldRule | null): entry is ProductSyncFieldRule => Boolean(entry));

  if (normalized.length > 0) return normalized;

  return DEFAULT_PRODUCT_SYNC_FIELD_RULES.map((rule) => ({
    id: randomUUID(),
    appField: rule.appField,
    baseField: rule.baseField,
    direction: rule.direction,
  }));
};

const normalizeProfile = (
  value: unknown,
  fallbackName = 'Base Product Sync'
): ProductSyncProfile | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = toTrimmedString(record['id']);
  const connectionId = toTrimmedString(record['connectionId']);
  const inventoryId = toTrimmedString(record['inventoryId']);
  if (!id || !connectionId || !inventoryId) return null;

  const conflictPolicyRaw = toTrimmedString(record['conflictPolicy']);
  const conflictPolicy: ProductSyncConflictPolicy = conflictPolicyRaw === 'skip' ? 'skip' : 'skip';

  return {
    id,
    name: toTrimmedString(record['name']) || fallbackName,
    enabled: record['enabled'] !== false,
    connectionId,
    inventoryId,
    catalogId: toTrimmedString(record['catalogId']) || null,
    scheduleIntervalMinutes: toBoundedInt(record['scheduleIntervalMinutes'], 30, 1, 24 * 60),
    batchSize: toBoundedInt(record['batchSize'], 100, 1, 500),
    conflictPolicy,
    fieldRules: normalizeFieldRules(record['fieldRules']),
    lastRunAt: toTrimmedString(record['lastRunAt']) || null,
    createdAt: toTrimmedString(record['createdAt']) || nowIso(),
    updatedAt: toTrimmedString(record['updatedAt']) || nowIso(),
  };
};

const readProfiles = async (): Promise<ProductSyncProfile[]> => {
  const raw = await readSettingValue(PROFILE_SETTINGS_KEY);
  const parsed = parseJson<unknown[]>(raw);
  const items = Array.isArray(parsed) ? parsed : [];
  return items
    .map((entry: unknown) => normalizeProfile(entry))
    .filter((entry: ProductSyncProfile | null): entry is ProductSyncProfile => Boolean(entry))
    .sort((a: ProductSyncProfile, b: ProductSyncProfile) => {
      const bDate = b.updatedAt ?? '';
      const aDate = a.updatedAt ?? '';
      return bDate.localeCompare(aDate);
    });
};

const writeProfiles = async (profiles: ProductSyncProfile[]): Promise<void> => {
  await writeSettingValue(PROFILE_SETTINGS_KEY, JSON.stringify(profiles));
};

export const listProductSyncProfiles = async (): Promise<ProductSyncProfile[]> => {
  return readProfiles();
};

export const getProductSyncProfile = async (
  profileId: string
): Promise<ProductSyncProfile | null> => {
  const normalizedId = toTrimmedString(profileId);
  if (!normalizedId) return null;
  const profiles = await readProfiles();
  return profiles.find((profile: ProductSyncProfile) => profile.id === normalizedId) ?? null;
};

export const createProductSyncProfile = async (
  input: Partial<ProductSyncProfile>
): Promise<ProductSyncProfile> => {
  const profiles = await readProfiles();
  const now = nowIso();
  const profile: ProductSyncProfile = {
    id: randomUUID(),
    name: toTrimmedString(input.name) || 'Base Product Sync',
    enabled: input.enabled !== false,
    connectionId: toTrimmedString(input.connectionId),
    inventoryId: toTrimmedString(input.inventoryId),
    catalogId: toTrimmedString(input.catalogId) || null,
    scheduleIntervalMinutes: toBoundedInt(input.scheduleIntervalMinutes, 30, 1, 24 * 60),
    batchSize: toBoundedInt(input.batchSize, 100, 1, 500),
    conflictPolicy: 'skip',
    fieldRules: normalizeFieldRules(input.fieldRules),
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  };

  profiles.unshift(profile);
  await writeProfiles(profiles);
  return profile;
};

export const updateProductSyncProfile = async (
  profileId: string,
  patch: Partial<ProductSyncProfile>
): Promise<ProductSyncProfile | null> => {
  const normalizedId = toTrimmedString(profileId);
  if (!normalizedId) return null;

  const profiles = await readProfiles();
  const index = profiles.findIndex((profile: ProductSyncProfile) => profile.id === normalizedId);
  if (index === -1) return null;

  const existing = profiles[index];
  if (!existing) return null;

  const merged: ProductSyncProfile = {
    ...existing,
    ...(patch.name !== undefined ? { name: toTrimmedString(patch.name) || existing.name } : {}),
    ...(patch.enabled !== undefined ? { enabled: Boolean(patch.enabled) } : {}),
    ...(patch.connectionId !== undefined
      ? { connectionId: toTrimmedString(patch.connectionId) || existing.connectionId }
      : {}),
    ...(patch.inventoryId !== undefined
      ? { inventoryId: toTrimmedString(patch.inventoryId) || existing.inventoryId }
      : {}),
    ...(patch.catalogId !== undefined
      ? { catalogId: toTrimmedString(patch.catalogId) || null }
      : {}),
    ...(patch.scheduleIntervalMinutes !== undefined
      ? {
          scheduleIntervalMinutes: toBoundedInt(
            patch.scheduleIntervalMinutes,
            existing.scheduleIntervalMinutes,
            1,
            24 * 60
          ),
        }
      : {}),
    ...(patch.batchSize !== undefined
      ? {
          batchSize: toBoundedInt(patch.batchSize, existing.batchSize, 1, 500),
        }
      : {}),
    ...(patch.fieldRules !== undefined
      ? { fieldRules: normalizeFieldRules(patch.fieldRules) }
      : {}),
    ...(patch.lastRunAt !== undefined
      ? { lastRunAt: toTrimmedString(patch.lastRunAt) || null }
      : {}),
    updatedAt: nowIso(),
  };

  profiles[index] = merged;
  await writeProfiles(profiles);
  return merged;
};

export const deleteProductSyncProfile = async (profileId: string): Promise<boolean> => {
  const normalizedId = toTrimmedString(profileId);
  if (!normalizedId) return false;

  const profiles = await readProfiles();
  const next = profiles.filter((profile: ProductSyncProfile) => profile.id !== normalizedId);
  if (next.length === profiles.length) return false;

  await writeProfiles(next);
  return true;
};

export const touchProductSyncProfileLastRunAt = async (
  profileId: string,
  timestamp: string
): Promise<void> => {
  await updateProductSyncProfile(profileId, { lastRunAt: timestamp });
};

export const listEnabledProductSyncProfiles = async (): Promise<ProductSyncProfile[]> => {
  const profiles = await readProfiles();
  return profiles.filter((profile: ProductSyncProfile) => profile.enabled);
};

const runKey = (runId: string): string => `${RUN_KEY_PREFIX}${runId}`;
const itemKey = (runId: string, itemId: string): string => `${ITEM_KEY_PREFIX}${runId}:${itemId}`;

const initialRunStats = (): ProductSyncRunStats => ({
  total: 0,
  processed: 0,
  success: 0,
  skipped: 0,
  failed: 0,
  localUpdated: 0,
  baseUpdated: 0,
});

const isTerminalRunStatus = (status: ProductSyncRunStatus): boolean =>
  status === 'completed' || status === 'partial_success' || status === 'failed';

const sortRunsByCreatedAtDesc = (
  left: ProductSyncRunRecord,
  right: ProductSyncRunRecord
): number => {
  const leftTimestamp =
    toTimestamp(left.createdAt) ?? toTimestamp(left.updatedAt) ?? toTimestamp(left.startedAt) ?? 0;
  const rightTimestamp =
    toTimestamp(right.createdAt) ??
    toTimestamp(right.updatedAt) ??
    toTimestamp(right.startedAt) ??
    0;
  return rightTimestamp - leftTimestamp;
};

const getRunLastActivityTimestamp = (run: ProductSyncRunRecord): number | null =>
  toTimestamp(run.updatedAt) ?? toTimestamp(run.startedAt) ?? toTimestamp(run.createdAt);

type ProductSyncStaleRecoveryResult = {
  checkedRuns: number;
  recoveredRuns: number;
  recoveredQueuedRuns: number;
  recoveredRunningRuns: number;
};

export const createProductSyncRun = async (input: {
  profileId: string;
  profileName: string;
  trigger: ProductSyncRunTrigger;
}): Promise<ProductSyncRunRecord> => {
  const timestamp = nowIso();
  const run: ProductSyncRunRecord = {
    id: randomUUID(),
    profileId: input.profileId,
    profileName: input.profileName,
    trigger: input.trigger,
    status: 'queued',
    queueJobId: null,
    startedAt: null,
    finishedAt: null,
    summaryMessage: null,
    errorMessage: null,
    stats: initialRunStats(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeSettingValue(runKey(run.id), JSON.stringify(run));
  return run;
};

export const getProductSyncRun = async (runId: string): Promise<ProductSyncRunRecord | null> => {
  const raw = await readSettingValue(runKey(runId));
  return parseJson<ProductSyncRunRecord>(raw);
};

export const updateProductSyncRun = async (
  runId: string,
  patch: Partial<ProductSyncRunRecord>
): Promise<ProductSyncRunRecord> => {
  const existing = await getProductSyncRun(runId);
  if (!existing) {
    throw new Error(`Product sync run not found: ${runId}`);
  }

  const merged: ProductSyncRunRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    profileId: existing.profileId,
    profileName: existing.profileName,
    trigger: existing.trigger,
    updatedAt: nowIso(),
  };

  await writeSettingValue(runKey(runId), JSON.stringify(merged));
  return merged;
};

export const updateProductSyncRunStatus = async (
  runId: string,
  status: ProductSyncRunStatus,
  patch?: Partial<ProductSyncRunRecord>
): Promise<ProductSyncRunRecord> => {
  const now = nowIso();
  const basePatch: Partial<ProductSyncRunRecord> = {
    status,
    ...(status === 'running' ? { startedAt: patch?.startedAt ?? now } : {}),
    ...(isTerminalRunStatus(status) ? { finishedAt: patch?.finishedAt ?? now } : {}),
  };
  return updateProductSyncRun(runId, {
    ...basePatch,
    ...(patch ?? {}),
  });
};

export const listProductSyncRuns = async (options?: {
  profileId?: string;
  limit?: number;
}): Promise<ProductSyncRunRecord[]> => {
  const limit = toBoundedInt(options?.limit, 50, 1, MAX_RUN_SCAN_LIMIT);
  const values = await listSettingValuesByPrefix(RUN_KEY_PREFIX, limit);
  const runs = values
    .map((value: string) => parseJson<ProductSyncRunRecord>(value))
    .filter((entry: ProductSyncRunRecord | null): entry is ProductSyncRunRecord => Boolean(entry))
    .sort(sortRunsByCreatedAtDesc);

  if (options?.profileId) {
    const profileId = toTrimmedString(options.profileId);
    return runs
      .filter((run: ProductSyncRunRecord) => run.profileId === profileId)
      .sort(sortRunsByCreatedAtDesc);
  }

  return runs;
};

export const hasActiveProductSyncRun = async (profileId: string): Promise<boolean> => {
  const runs = await listProductSyncRuns({ profileId, limit: 200 });
  return runs.some(
    (run: ProductSyncRunRecord) => run.status === 'queued' || run.status === 'running'
  );
};

export const putProductSyncRunItem = async (
  item: ProductSyncRunItemRecord
): Promise<ProductSyncRunItemRecord> => {
  const normalized: ProductSyncRunItemRecord = {
    ...item,
    localChanges: Array.isArray(item.localChanges) ? item.localChanges : [],
    baseChanges: Array.isArray(item.baseChanges) ? item.baseChanges : [],
    message: item.message ?? null,
    errorMessage: item.errorMessage ?? null,
    updatedAt: nowIso(),
  };

  await writeSettingValue(itemKey(item.runId, item.itemId), JSON.stringify(normalized));
  return normalized;
};

export const listProductSyncRunItems = async (
  runId: string,
  limit = ITEM_LIMIT_HARD
): Promise<ProductSyncRunItemRecord[]> => {
  const values = await listSettingValuesByPrefix(
    `${ITEM_KEY_PREFIX}${runId}:`,
    Math.min(ITEM_LIMIT_HARD, Math.max(1, limit))
  );

  return values
    .map((value: string) => parseJson<ProductSyncRunItemRecord>(value))
    .filter((entry: ProductSyncRunItemRecord | null): entry is ProductSyncRunItemRecord =>
      Boolean(entry)
    )
    .sort((a: ProductSyncRunItemRecord, b: ProductSyncRunItemRecord) =>
      a.itemId.localeCompare(b.itemId)
    );
};

export const getProductSyncRunDetail = async (
  runId: string,
  options?: {
    page?: number;
    pageSize?: number;
    includeItems?: boolean;
  }
): Promise<ProductSyncRunDetail | null> => {
  const run = await getProductSyncRun(runId);
  if (!run) return null;

  const page = toBoundedInt(options?.page, 1, 1, 10_000);
  const pageSize = toBoundedInt(options?.pageSize, 100, 1, 2_000);

  if (options?.includeItems === false) {
    return {
      run,
      items: [],
      pagination: {
        page,
        pageSize,
        totalItems: run.stats.total,
        totalPages: Math.max(1, Math.ceil(run.stats.total / pageSize)),
      },
    };
  }

  const items = await listProductSyncRunItems(runId);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    run,
    items: items.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
    },
  };
};

export const recomputeProductSyncRunStats = async (
  runId: string
): Promise<ProductSyncRunRecord> => {
  const run = await getProductSyncRun(runId);
  if (!run) {
    throw new Error(`Product sync run not found: ${runId}`);
  }

  const items = await listProductSyncRunItems(runId);
  const stats: ProductSyncRunStats = {
    total: items.length,
    processed: items.length,
    success: 0,
    skipped: 0,
    failed: 0,
    localUpdated: 0,
    baseUpdated: 0,
  };

  for (const item of items) {
    if (item.status === 'success') stats.success += 1;
    if (item.status === 'skipped') stats.skipped += 1;
    if (item.status === 'failed') stats.failed += 1;
    if (item.localChanges.length > 0) stats.localUpdated += 1;
    if (item.baseChanges.length > 0) stats.baseUpdated += 1;
  }

  return updateProductSyncRun(runId, { stats });
};

export const deleteProductSyncRunItems = async (runId: string): Promise<void> => {
  const items = await listProductSyncRunItems(runId);
  await Promise.all(
    items.map((item: ProductSyncRunItemRecord) => deleteSettingByKey(itemKey(runId, item.itemId)))
  );
};

export const deleteProductSyncRun = async (runId: string): Promise<void> => {
  const normalizedRunId = toTrimmedString(runId);
  if (!normalizedRunId) return;
  await deleteProductSyncRunItems(normalizedRunId);
  await deleteSettingByKey(runKey(normalizedRunId));
};

export const pruneProductSyncRunsForProfile = async (input: {
  profileId: string;
  keep?: number;
}): Promise<number> => {
  const profileId = toTrimmedString(input.profileId);
  if (!profileId) return 0;

  const keep = toBoundedInt(input.keep, PRODUCT_SYNC_RUN_HISTORY_KEEP, 10, MAX_RUN_SCAN_LIMIT);
  const runs = await listProductSyncRuns({ profileId, limit: MAX_RUN_SCAN_LIMIT });
  if (runs.length <= keep) return 0;

  const obsoleteRuns = [...runs].sort(sortRunsByCreatedAtDesc).slice(keep);

  for (const run of obsoleteRuns) {
    await deleteProductSyncRun(run.id);
  }

  return obsoleteRuns.length;
};

export const recoverStaleProductSyncRuns = async (options?: {
  profileId?: string;
  now?: Date;
  limit?: number;
  staleQueuedMs?: number;
  staleRunningMs?: number;
}): Promise<ProductSyncStaleRecoveryResult> => {
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();
  const nowIsoValue = now.toISOString();
  const limit = toBoundedInt(options?.limit, 200, 1, MAX_RUN_SCAN_LIMIT);
  const staleQueuedMs = toBoundedInt(
    options?.staleQueuedMs,
    PRODUCT_SYNC_STALE_QUEUED_MS,
    60_000,
    24 * 60 * 60 * 1000
  );
  const staleRunningMs = toBoundedInt(
    options?.staleRunningMs,
    PRODUCT_SYNC_STALE_RUNNING_MS,
    5 * 60 * 1000,
    7 * 24 * 60 * 60 * 1000
  );

  const runs = await listProductSyncRuns({
    ...(options?.profileId ? { profileId: toTrimmedString(options.profileId) } : {}),
    limit,
  });

  let recoveredRuns = 0;
  let recoveredQueuedRuns = 0;
  let recoveredRunningRuns = 0;

  for (const run of runs) {
    if (run.status !== 'queued' && run.status !== 'running') continue;

    const lastActivityMs = getRunLastActivityTimestamp(run);
    if (lastActivityMs === null) continue;

    const ageMs = Math.max(0, nowMs - lastActivityMs);
    if (run.status === 'queued' && ageMs < staleQueuedMs) continue;
    if (run.status === 'running' && ageMs < staleRunningMs) continue;

    const thresholdMs = run.status === 'queued' ? staleQueuedMs : staleRunningMs;
    const thresholdMinutes = Math.max(1, Math.floor(thresholdMs / 60_000));
    const staleMessage =
      run.status === 'queued'
        ? `Run marked failed automatically after being queued for over ${thresholdMinutes} minute(s) without worker pickup.`
        : `Run marked failed automatically after exceeding ${thresholdMinutes} minute(s) without progress heartbeat.`;

    await updateProductSyncRunStatus(run.id, 'failed', {
      finishedAt: nowIsoValue,
      summaryMessage: staleMessage,
      errorMessage: staleMessage,
    });

    recoveredRuns += 1;
    if (run.status === 'queued') {
      recoveredQueuedRuns += 1;
    } else {
      recoveredRunningRuns += 1;
    }
  }

  return {
    checkedRuns: runs.length,
    recoveredRuns,
    recoveredQueuedRuns,
    recoveredRunningRuns,
  };
};

export const findDueProductSyncProfiles = async (
  now = new Date()
): Promise<ProductSyncProfile[]> => {
  const profiles = await listEnabledProductSyncProfiles();
  const runs = await listProductSyncRuns({ limit: 500 });
  const activeProfileIds = new Set(
    runs
      .filter((run: ProductSyncRunRecord) => run.status === 'queued' || run.status === 'running')
      .map((run: ProductSyncRunRecord) => run.profileId)
  );
  const nowMs = now.getTime();

  return profiles.filter((profile: ProductSyncProfile) => {
    if (activeProfileIds.has(profile.id)) return false;
    const lastRunMs = toTimestamp(profile.lastRunAt);
    if (lastRunMs === null) return true;
    const intervalMs = profile.scheduleIntervalMinutes * 60 * 1000;
    return nowMs - lastRunMs >= intervalMs;
  });
};
