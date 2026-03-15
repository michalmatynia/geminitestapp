import type { DatabaseBrowse, SchemaResponse } from '@/shared/contracts/database';
import type { HttpResult } from '@/shared/contracts/http';

import { apiFetch, apiPost } from './base';

export type DbProvider = 'auto' | 'mongodb';
export type DbSchemaProvider = DbProvider | 'all';

export type DbActionPayload = {
  provider?: DbProvider;
  action: string;
  collection: string;
  collectionMap?: Record<string, string>;
  filter?: unknown;
  pipeline?: unknown[];
  document?: unknown;
  documents?: unknown[];
  update?: unknown;
  projection?: unknown;
  sort?: unknown;
  limit?: number;
  idType?: string;
  distinctField?: string;
  upsert?: boolean;
  returnDocument?: 'before' | 'after';
};

export type DbQueryPayload = {
  provider: DbProvider;
  collection: string;
  collectionMap?: Record<string, string>;
  filter: unknown;
  projection?: unknown;
  sort?: unknown;
  limit?: number;
  single?: boolean;
  idType?: string | undefined;
};

export type DbUpdatePayload = {
  provider: DbProvider;
  collection: string;
  collectionMap?: Record<string, string>;
  filter: unknown;
  update: unknown;
  single?: boolean;
  idType?: string;
};

export type EntityUpdatePayload = {
  entityType: string;
  entityId?: string;
  updates: unknown;
  mode?: 'replace' | 'append';
};

type DbRequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

const parsePositiveInt = (raw: string | undefined): number | null => {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const DEFAULT_API_TIMEOUT_MS = 15_000;
const DEFAULT_SERVER_DB_ACTION_TIMEOUT_MS = 30_000;
const SERVER_DB_ACTION_TIMEOUT_MS =
  parsePositiveInt(process.env['AI_PATHS_DB_ACTION_TIMEOUT_MS']) ??
  DEFAULT_SERVER_DB_ACTION_TIMEOUT_MS;

const normalizeDbProvider = (provider: unknown): DbProvider | undefined =>
  provider === 'auto' || provider === 'mongodb' ? provider : undefined;

const resolveDbActionTimeoutMs = (timeoutMs?: number): number => {
  if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return Math.max(1_000, Math.floor(timeoutMs));
  }
  if (typeof window === 'undefined') {
    return Math.max(DEFAULT_API_TIMEOUT_MS, SERVER_DB_ACTION_TIMEOUT_MS);
  }
  return DEFAULT_API_TIMEOUT_MS;
};

export async function databaseAction<T>(
  input: DbActionPayload,
  options?: DbRequestOptions
): Promise<HttpResult<T>> {
  const provider = normalizeDbProvider(input.provider);
  const payload: DbActionPayload = {
    ...(provider ? { provider } : {}),
    collection: input.collection,
    ...(input.collectionMap ? { collectionMap: input.collectionMap } : {}),
    action: input.action,
    ...(input.filter !== undefined ? { filter: input.filter } : {}),
    ...(input.pipeline !== undefined ? { pipeline: input.pipeline } : {}),
    ...(input.document !== undefined ? { document: input.document } : {}),
    ...(input.documents !== undefined ? { documents: input.documents } : {}),
    ...(input.update !== undefined ? { update: input.update } : {}),
    ...(input.projection !== undefined ? { projection: input.projection } : {}),
    ...(input.sort !== undefined ? { sort: input.sort } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.idType !== undefined ? { idType: input.idType } : {}),
    ...(input.distinctField !== undefined ? { distinctField: input.distinctField } : {}),
    ...(input.upsert !== undefined ? { upsert: input.upsert } : {}),
    ...(input.returnDocument !== undefined ? { returnDocument: input.returnDocument } : {}),
  };
  return apiPost<T>('/api/ai-paths/db-action', payload, {
    timeoutMs: resolveDbActionTimeoutMs(options?.timeoutMs),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
}

export async function databaseQuery<T>(payload: DbQueryPayload): Promise<HttpResult<T>> {
  const provider = normalizeDbProvider(payload.provider);
  return apiPost<T>('/api/ai-paths/db-action', {
    ...(provider ? { provider } : {}),
    collection: payload.collection,
    ...(payload.collectionMap ? { collectionMap: payload.collectionMap } : {}),
    action: payload.single ? 'findOne' : 'find',
    filter: payload.filter,
    ...(payload.projection !== undefined ? { projection: payload.projection } : {}),
    ...(payload.sort !== undefined ? { sort: payload.sort } : {}),
    ...(payload.limit !== undefined ? { limit: payload.limit } : {}),
    ...(payload.idType !== undefined ? { idType: payload.idType } : {}),
  });
}

export async function databaseUpdate<T>(payload: DbUpdatePayload): Promise<HttpResult<T>> {
  const provider = normalizeDbProvider(payload.provider);
  return apiPost<T>('/api/ai-paths/db-action', {
    ...(provider ? { provider } : {}),
    collection: payload.collection,
    ...(payload.collectionMap ? { collectionMap: payload.collectionMap } : {}),
    action: payload.single === false ? 'updateMany' : 'updateOne',
    filter: payload.filter,
    update: payload.update,
    ...(payload.idType !== undefined ? { idType: payload.idType } : {}),
  });
}

export async function entityUpdate<T>(payload: EntityUpdatePayload): Promise<HttpResult<T>> {
  return apiPost<T>('/api/ai-paths/update', payload);
}

export async function fetchSchema(args?: {
  provider?: DbSchemaProvider;
  includeCounts?: boolean;
}): Promise<HttpResult<SchemaResponse>> {
  const params = new URLSearchParams();
  if (args?.provider) params.set('provider', args.provider);
  if (args?.includeCounts) params.set('includeCounts', 'true');
  const query = params.toString();
  const url = query ? `/api/databases/schema?${query}` : '/api/databases/schema';
  return apiFetch<SchemaResponse>(url);
}

export async function browseDatabase(args: {
  provider?: DbProvider;
  collection: string;
  query?: string;
  limit?: number;
  skip?: number;
}): Promise<HttpResult<DatabaseBrowse>> {
  const params = new URLSearchParams();
  params.set('collection', args.collection);
  params.set('provider', args.provider ?? 'auto');
  if (typeof args.limit === 'number') params.set('limit', String(args.limit));
  if (typeof args.skip === 'number') params.set('skip', String(args.skip));
  if (typeof args.query === 'string' && args.query.trim()) {
    params.set('query', args.query.trim());
  }
  return apiFetch<DatabaseBrowse>(`/api/databases/browse?${params.toString()}`);
}
