import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import type {
  BaseImportItemRecord,
  BaseImportItemStatus,
  BaseImportParameterImportSummary,
  BaseImportRunDetailResponse,
  BaseImportErrorClass,
  BaseImportRunParameterImportSummary,
  BaseImportRunParams,
  BaseImportRunRecord,
  BaseImportRunStats,
  BaseImportRunStatus,
  BaseImportPreflight,
} from '@/shared/contracts/integrations';
import type { MongoTimestampedStringSettingRecord } from '@/shared/contracts/settings';
import { mutateAgentLease } from '@/shared/lib/agent-lease-service';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Filter } from 'mongodb';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const RUN_KEY_PREFIX = 'base_import_run:';
const ITEM_KEY_PREFIX = 'base_import_run_item:';
const LIST_LIMIT_DEFAULT = 50;
const RUN_ITEM_HARD_LIMIT = 100_000;
const BASE_IMPORT_AGENT_RESOURCE_ID = 'integrations.base-import.run';

type SettingDoc = MongoTimestampedStringSettingRecord<string | ObjectId, Date>;

const toRunLeasePatch = (
  lease:
    | {
      ownerAgentId: string;
      leaseId: string;
      heartbeatAt?: string | null;
      expiresAt?: string | null;
    }
    | null
): Partial<BaseImportRunRecord> => ({
  lockOwnerId: lease?.ownerAgentId ?? null,
  lockToken: lease?.leaseId ?? null,
  lockHeartbeatAt: lease?.heartbeatAt ?? null,
  lockExpiresAt: lease?.expiresAt ?? null,
});

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const nowIso = (): string => new Date().toISOString();
const toTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};
const isRunTerminal = (status: BaseImportRunStatus): boolean =>
  status === 'completed' ||
  status === 'partial_success' ||
  status === 'failed' ||
  status === 'canceled';

const runKey = (runId: string): string => `${RUN_KEY_PREFIX}${runId}`;

const itemKey = (runId: string, itemId: string): string => `${ITEM_KEY_PREFIX}${runId}:${itemId}`;

const parseJson = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const toNonNegativeInt = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
};

const createEmptyRunParameterImportSummary = (): BaseImportRunParameterImportSummary => ({
  itemsApplied: 0,
  extracted: 0,
  resolved: 0,
  created: 0,
  written: 0,
});

const normalizeParameterImportSummary = (
  value: unknown
): BaseImportParameterImportSummary | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    extracted: toNonNegativeInt(record['extracted']),
    resolved: toNonNegativeInt(record['resolved']),
    created: toNonNegativeInt(record['created']),
    written: toNonNegativeInt(record['written']),
  };
};

const normalizeRunParameterImportSummary = (
  value: unknown
): BaseImportRunParameterImportSummary => {
  const summary = normalizeParameterImportSummary(value);
  if (!summary || !value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyRunParameterImportSummary();
  }
  const record = value as Record<string, unknown>;
  return {
    itemsApplied: toNonNegativeInt(record['itemsApplied']),
    extracted: summary.extracted,
    resolved: summary.resolved,
    created: summary.created,
    written: summary.written,
  };
};

const initialStats = (total = 0): BaseImportRunStats => ({
  total,
  pending: total,
  processing: 0,
  imported: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
  parameterImportSummary: createEmptyRunParameterImportSummary(),
});

const normalizeRunStats = (value: unknown): BaseImportRunStats => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return initialStats(0);
  }
  const record = value as Record<string, unknown>;
  const total = toNonNegativeInt(record['total']);
  const processing = toNonNegativeInt(record['processing']);
  const imported = toNonNegativeInt(record['imported']);
  const updated = toNonNegativeInt(record['updated']);
  const skipped = toNonNegativeInt(record['skipped']);
  const failed = toNonNegativeInt(record['failed']);
  const pendingRaw = toNonNegativeInt(record['pending']);
  const pendingMax = Math.max(0, total - processing - imported - updated - skipped - failed);
  return {
    total,
    pending: Math.min(pendingRaw, pendingMax),
    processing,
    imported,
    updated,
    skipped,
    failed,
    parameterImportSummary: normalizeRunParameterImportSummary(record['parameterImportSummary']),
  };
};

const normalizeRunRecord = (run: BaseImportRunRecord): BaseImportRunRecord => ({
  ...run,
  stats: normalizeRunStats(run.stats),
});

const readSettingValue = async (key: string): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo.collection<SettingDoc>('settings').findOne({
    $or: [{ _id: toMongoId(key) }, { key }],
  });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const writeSettingValue = async (key: string, value: string): Promise<void> => {
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
};

const deleteSettingByKey = async (key: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<SettingDoc>('settings').deleteMany({
    $or: [{ _id: toMongoId(key) }, { key }],
  } as Filter<SettingDoc>);
};

const listSettingValuesByPrefix = async (
  prefix: string,
  take = LIST_LIMIT_DEFAULT
): Promise<string[]> => {
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
};

export const createBaseImportRun = async (input: {
  params: BaseImportRunParams;
  preflight: BaseImportPreflight;
  idempotencyKey?: string | null;
  totalItems?: number;
  summaryMessage?: string | null;
  maxAttempts?: number;
}): Promise<BaseImportRunRecord> => {
  const timestamp = nowIso();
  const record: BaseImportRunRecord = {
    id: randomUUID(),
    status: input.preflight.ok ? 'queued' : 'failed',
    params: input.params,
    idempotencyKey: input.idempotencyKey ?? null,
    queueJobId: null,
    lockOwnerId: null,
    lockToken: null,
    lockExpiresAt: null,
    lockHeartbeatAt: null,
    cancellationRequestedAt: null,
    canceledAt: null,
    maxAttempts:
      typeof input.maxAttempts === 'number' &&
      Number.isFinite(input.maxAttempts) &&
      input.maxAttempts > 0
        ? Math.floor(input.maxAttempts)
        : 3,
    preflight: input.preflight,
    stats: initialStats(input.totalItems ?? 0),
    startedAt: null,
    finishedAt: input.preflight.ok ? null : timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    summaryMessage: input.summaryMessage ?? null,
  } as BaseImportRunRecord;
  await writeSettingValue(runKey(record.id), JSON.stringify(record));
  return normalizeRunRecord(record);
};

export const getBaseImportRun = async (runId: string): Promise<BaseImportRunRecord | null> => {
  const raw = await readSettingValue(runKey(runId));
  const parsed = parseJson<BaseImportRunRecord>(raw);
  return parsed ? normalizeRunRecord(parsed) : null;
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
  const normalized = normalizeRunRecord(merged);
  await writeSettingValue(runKey(runId), JSON.stringify(normalized));
  return normalized;
};

export const listBaseImportRuns = async (
  limit = LIST_LIMIT_DEFAULT
): Promise<BaseImportRunRecord[]> => {
  const values = await listSettingValuesByPrefix(RUN_KEY_PREFIX, limit);
  return values
    .map((value: string) => parseJson<BaseImportRunRecord>(value))
    .filter((record: BaseImportRunRecord | null): record is BaseImportRunRecord => Boolean(record))
    .map((record: BaseImportRunRecord) => normalizeRunRecord(record));
};

export const putBaseImportRunItems = async (items: BaseImportItemRecord[]): Promise<number> => {
  if (items.length === 0) return 0;
  const now = nowIso();

  const normalizedItems = items.map((item) => ({
    ...item,
    errorClass: item.errorClass ?? null,
    retryable: item.retryable ?? null,
    nextRetryAt: item.nextRetryAt ?? null,
    lastErrorAt: item.lastErrorAt ?? null,
    parameterImportSummary: normalizeParameterImportSummary(item.parameterImportSummary),
    updatedAt: now,
  }));

  const mongo = await getMongoDb();
  const bulkOps = normalizedItems.map((item) => ({
    updateOne: {
      filter: { key: itemKey(item.runId, item.itemId) },
      update: {
        $set: {
          key: itemKey(item.runId, item.itemId),
          value: JSON.stringify(item),
          updatedAt: new Date(now),
        },
      },
      upsert: true,
    },
  }));
  const result = await mongo.collection<SettingDoc>('settings').bulkWrite(bulkOps);
  return (result.modifiedCount || 0) + (result.upsertedCount || 0);
};

export const putBaseImportRunItem = async (
  item: BaseImportItemRecord
): Promise<BaseImportItemRecord> => {
  const normalized: BaseImportItemRecord = {
    ...item,
    errorClass: item.errorClass ?? null,
    retryable: item.retryable ?? null,
    nextRetryAt: item.nextRetryAt ?? null,
    lastErrorAt: item.lastErrorAt ?? null,
    parameterImportSummary: normalizeParameterImportSummary(item.parameterImportSummary),
    updatedAt: nowIso(),
  };
  await writeSettingValue(itemKey(item.runId, item.itemId), JSON.stringify(normalized));
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
    errorClass: patch.errorClass ?? existing.errorClass ?? null,
    retryable: patch.retryable ?? existing.retryable ?? null,
    nextRetryAt: patch.nextRetryAt ?? existing.nextRetryAt ?? null,
    lastErrorAt: patch.lastErrorAt ?? existing.lastErrorAt ?? null,
    parameterImportSummary:
      patch.parameterImportSummary !== undefined
        ? normalizeParameterImportSummary(patch.parameterImportSummary)
        : normalizeParameterImportSummary(existing.parameterImportSummary),
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
  const parsed = parseJson<BaseImportItemRecord>(raw);
  if (!parsed) return null;
  return {
    ...parsed,
    errorClass: normalizeItemErrorClass(parsed),
    retryable: typeof parsed.retryable === 'boolean' ? parsed.retryable : null,
    nextRetryAt: parsed.nextRetryAt ?? null,
    lastErrorAt: parsed.lastErrorAt ?? null,
    parameterImportSummary: normalizeParameterImportSummary(parsed.parameterImportSummary),
  };
};

type ListBaseImportRunItemsOptions = {
  limit?: number;
  statuses?: BaseImportItemStatus[];
  page?: number;
  pageSize?: number;
  retryDueOnly?: boolean;
  now?: string;
};

const filterItems = (
  items: BaseImportItemRecord[],
  options: ListBaseImportRunItemsOptions
): BaseImportItemRecord[] => {
  const statusFilter =
    Array.isArray(options.statuses) && options.statuses.length > 0
      ? new Set<BaseImportItemStatus>(options.statuses)
      : null;
  const nowTimestamp = toTimestamp(options.now ?? nowIso());
  return items.filter((item: BaseImportItemRecord): boolean => {
    if (statusFilter && !statusFilter.has(item.status)) return false;
    if (!options.retryDueOnly) return true;
    if (item.status !== 'pending') return false;
    const retryAt = toTimestamp(item.nextRetryAt ?? null);
    if (retryAt === null || nowTimestamp === null) return true;
    return retryAt <= nowTimestamp;
  });
};

const normalizeItemErrorClass = (item: BaseImportItemRecord): BaseImportErrorClass | null =>
  item.errorClass === 'transient' ||
  item.errorClass === 'permanent' ||
  item.errorClass === 'configuration' ||
  item.errorClass === 'canceled'
    ? item.errorClass
    : null;

const normalizeListOptions = (
  limitOrOptions: number | ListBaseImportRunItemsOptions | undefined
): ListBaseImportRunItemsOptions => {
  if (typeof limitOrOptions === 'number') {
    return { limit: limitOrOptions };
  }
  return limitOrOptions ?? {};
};

export const listBaseImportRunItems = async (
  runId: string,
  limitOrOptions?: number | ListBaseImportRunItemsOptions
): Promise<BaseImportItemRecord[]> => {
  const options = normalizeListOptions(limitOrOptions);
  const requestedLimit =
    typeof options.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0
      ? Math.floor(options.limit)
      : 10_000;
  const values = await listSettingValuesByPrefix(
    `${ITEM_KEY_PREFIX}${runId}:`,
    Math.min(requestedLimit, RUN_ITEM_HARD_LIMIT)
  );
  const items = values
    .map((value: string) => parseJson<BaseImportItemRecord>(value))
    .filter((item: BaseImportItemRecord | null): item is BaseImportItemRecord => Boolean(item))
    .map(
      (item: BaseImportItemRecord): BaseImportItemRecord => ({
        ...item,
        errorClass: normalizeItemErrorClass(item),
        retryable: typeof item.retryable === 'boolean' ? item.retryable : null,
        nextRetryAt: item.nextRetryAt ?? null,
        lastErrorAt: item.lastErrorAt ?? null,
        parameterImportSummary: normalizeParameterImportSummary(item.parameterImportSummary),
      })
    )
    .sort((a: BaseImportItemRecord, b: BaseImportItemRecord) => a.itemId.localeCompare(b.itemId));
  return filterItems(items, options);
};

export const listBaseImportRunItemsPage = async (
  runId: string,
  options?: {
    statuses?: BaseImportItemStatus[];
    page?: number;
    pageSize?: number;
    retryDueOnly?: boolean;
  }
): Promise<{
  items: BaseImportItemRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}> => {
  const page =
    typeof options?.page === 'number' && Number.isFinite(options.page) && options.page > 0
      ? Math.floor(options.page)
      : 1;
  const pageSizeRaw =
    typeof options?.pageSize === 'number' &&
    Number.isFinite(options.pageSize) &&
    options.pageSize > 0
      ? Math.floor(options.pageSize)
      : 200;
  const pageSize = Math.min(pageSizeRaw, RUN_ITEM_HARD_LIMIT);
  const filtered = await listBaseImportRunItems(runId, {
    limit: RUN_ITEM_HARD_LIMIT,
    ...(options?.statuses !== undefined && { statuses: options.statuses }),
    ...(options?.retryDueOnly !== undefined && { retryDueOnly: options.retryDueOnly }),
  });
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: filtered.slice(start, end),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
};

export const deleteBaseImportRunItems = async (runId: string): Promise<void> => {
  const items = await listBaseImportRunItems(runId);
  await Promise.all(
    items.map((item: BaseImportItemRecord) => deleteSettingByKey(itemKey(runId, item.itemId)))
  );
};

export const computeBaseImportRunStats = (items: BaseImportItemRecord[]): BaseImportRunStats => {
  const stats: BaseImportRunStats = initialStats(items.length);
  const parameterImportSummary =
    stats.parameterImportSummary ?? createEmptyRunParameterImportSummary();
  for (const item of items) {
    if (item.status === 'processing') stats.processing += 1;
    if (item.status === 'imported') stats.imported += 1;
    if (item.status === 'updated') stats.updated += 1;
    if (item.status === 'skipped') stats.skipped += 1;
    if (item.status === 'failed') stats.failed += 1;
    const itemSummary = normalizeParameterImportSummary(item.parameterImportSummary);
    if (itemSummary) {
      parameterImportSummary.itemsApplied += 1;
      parameterImportSummary.extracted += itemSummary.extracted;
      parameterImportSummary.resolved += itemSummary.resolved;
      parameterImportSummary.created += itemSummary.created;
      parameterImportSummary.written += itemSummary.written;
    }
  }
  stats.pending = Math.max(
    0,
    stats.total - stats.processing - stats.imported - stats.updated - stats.skipped - stats.failed
  );
  stats.parameterImportSummary = parameterImportSummary;
  return stats;
};

export const recomputeBaseImportRunStats = async (runId: string): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw new Error(`Base import run not found: ${runId}`);
  }
  const items = await listBaseImportRunItems(runId);
  const stats = computeBaseImportRunStats(items);
  return updateBaseImportRun(runId, { stats });
};

export const getBaseImportRunDetail = async (
  runId: string,
  options?: {
    statuses?: BaseImportItemStatus[];
    page?: number;
    pageSize?: number;
    includeItems?: boolean;
  }
): Promise<BaseImportRunDetailResponse | null> => {
  const run = await getBaseImportRun(runId);
  if (!run) return null;
  if (options?.includeItems === false) {
    const pageSize =
      typeof options.pageSize === 'number' &&
      Number.isFinite(options.pageSize) &&
      options.pageSize > 0
        ? Math.floor(options.pageSize)
        : 200;
    const stats = normalizeRunStats(run.stats);
    return {
      run,
      items: [],
      pagination: {
        page: 1,
        pageSize,
        totalItems: stats.total,
        totalPages: Math.max(1, Math.ceil(stats.total / pageSize)),
      },
    };
  }
  const paged = await listBaseImportRunItemsPage(runId, {
    ...(options?.statuses !== undefined && { statuses: options.statuses }),
    ...(options?.page !== undefined && { page: options.page }),
    ...(options?.pageSize !== undefined && { pageSize: options.pageSize }),
  });
  return {
    run,
    items: paged.items,
    pagination: {
      page: paged.page,
      pageSize: paged.pageSize,
      totalItems: paged.totalItems,
      totalPages: paged.totalPages,
    },
  };
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
    ...(status === 'completed' ||
    status === 'partial_success' ||
    status === 'failed' ||
    status === 'canceled'
      ? { finishedAt: patch?.finishedAt ?? now }
      : {}),
  };
  return updateBaseImportRun(runId, { ...basePatch, ...(patch ?? {}) });
};

export const requestBaseImportRunCancellation = async (
  runId: string
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw new Error(`Base import run not found: ${runId}`);
  }
  if (isRunTerminal(run.status)) return run;
  const now = nowIso();
  return updateBaseImportRun(runId, {
    cancellationRequestedAt: run.cancellationRequestedAt ?? now,
    summaryMessage: run.summaryMessage ?? 'Cancellation requested. Waiting for worker to stop.',
  });
};

export const acquireBaseImportRunLease = async (input: {
  runId: string;
  ownerId: string;
  leaseMs: number;
}): Promise<{ acquired: boolean; run: BaseImportRunRecord | null; reason?: string }> => {
  const run = await getBaseImportRun(input.runId);
  if (!run) {
    return { acquired: false, run: null, reason: 'RUN_NOT_FOUND' };
  }
  if (isRunTerminal(run.status)) {
    return { acquired: false, run, reason: 'RUN_TERMINAL' };
  }
  const result = mutateAgentLease({
    action: 'claim',
    resourceId: BASE_IMPORT_AGENT_RESOURCE_ID,
    scopeId: input.runId,
    ownerAgentId: input.ownerId,
    ownerRunId: input.runId,
    leaseMs: input.leaseMs,
  });
  if (result.ok && result.lease) {
    const leased = await updateBaseImportRun(input.runId, toRunLeasePatch(result.lease));
    return { acquired: true, run: leased };
  }

  if (result.conflictingLease) {
    const synced = await updateBaseImportRun(input.runId, toRunLeasePatch(result.conflictingLease));
    return { acquired: false, run: synced, reason: 'LOCKED_BY_OTHER' };
  }

  return { acquired: false, run, reason: result.code.toUpperCase() };
};

export const heartbeatBaseImportRunLease = async (input: {
  runId: string;
  ownerId: string;
  leaseMs: number;
}): Promise<BaseImportRunRecord | null> => {
  const run = await getBaseImportRun(input.runId);
  if (!run) return null;
  const result = mutateAgentLease({
    action: 'renew',
    resourceId: BASE_IMPORT_AGENT_RESOURCE_ID,
    scopeId: input.runId,
    ownerAgentId: input.ownerId,
    ownerRunId: input.runId,
    leaseId: run.lockToken ?? undefined,
    leaseMs: input.leaseMs,
  });
  if (!result.ok || !result.lease) return null;
  return updateBaseImportRun(input.runId, toRunLeasePatch(result.lease));
};

export const releaseBaseImportRunLease = async (input: {
  runId: string;
  ownerId: string;
}): Promise<BaseImportRunRecord | null> => {
  const run = await getBaseImportRun(input.runId);
  if (!run) return null;
  if (run.lockOwnerId !== input.ownerId) return run;
  const result = mutateAgentLease({
    action: 'release',
    resourceId: BASE_IMPORT_AGENT_RESOURCE_ID,
    scopeId: input.runId,
    ownerAgentId: input.ownerId,
    ownerRunId: input.runId,
    leaseId: run.lockToken ?? undefined,
  });
  if (!result.ok && result.code !== 'not_found') {
    return run;
  }
  return updateBaseImportRun(input.runId, toRunLeasePatch(null));
};
