import type { DatabaseBrowse, SchemaResponse } from '@/shared/contracts/database';
import type { HttpResult } from '@/shared/contracts/http';

import { apiFetch, apiPost, withApiCsrfHeaders } from './base';

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
const DEFAULT_SERVER_DB_ACTION_TIMEOUT_MS = 120_000;
const SERVER_DB_ACTION_TIMEOUT_MS =
  parsePositiveInt(process.env['AI_PATHS_DB_ACTION_TIMEOUT_MS']) ??
  DEFAULT_SERVER_DB_ACTION_TIMEOUT_MS;

const normalizeDbProvider = (provider: unknown): DbProvider | undefined =>
  provider === 'auto' || provider === 'mongodb' ? provider : undefined;

const assignDefined = <T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined
): void => {
  if (value !== undefined) {
    Object.assign(target, { [key]: value });
  }
};

const resolveDbActionTimeoutMs = (timeoutMs?: number): number => {
  if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return Math.max(1_000, Math.floor(timeoutMs));
  }
  if (typeof window === 'undefined') {
    return Math.max(DEFAULT_API_TIMEOUT_MS, SERVER_DB_ACTION_TIMEOUT_MS);
  }
  return DEFAULT_API_TIMEOUT_MS;
};

const createDbRequestOptions = (
  options?: DbRequestOptions
): { timeoutMs: number; signal?: AbortSignal } => {
  const requestOptions: { timeoutMs: number; signal?: AbortSignal } = {
    timeoutMs: resolveDbActionTimeoutMs(options?.timeoutMs),
  };
  if (options?.signal !== undefined) {
    requestOptions.signal = options.signal;
  }
  return requestOptions;
};

const createDbActionPayload = (input: DbActionPayload): DbActionPayload => {
  const payload: DbActionPayload = {
    collection: input.collection,
    action: input.action,
  };
  assignDefined(payload, 'provider', normalizeDbProvider(input.provider));
  assignDefined(payload, 'collectionMap', input.collectionMap);
  assignDefined(payload, 'filter', input.filter);
  assignDefined(payload, 'pipeline', input.pipeline);
  assignDefined(payload, 'document', input.document);
  assignDefined(payload, 'documents', input.documents);
  assignDefined(payload, 'update', input.update);
  assignDefined(payload, 'projection', input.projection);
  assignDefined(payload, 'sort', input.sort);
  assignDefined(payload, 'limit', input.limit);
  assignDefined(payload, 'idType', input.idType);
  assignDefined(payload, 'distinctField', input.distinctField);
  assignDefined(payload, 'upsert', input.upsert);
  assignDefined(payload, 'returnDocument', input.returnDocument);
  return payload;
};

export async function databaseAction<T>(
  input: DbActionPayload,
  options?: DbRequestOptions
): Promise<HttpResult<T>> {
  return apiPost<T>(
    '/api/ai-paths/db-action',
    createDbActionPayload(input),
    createDbRequestOptions(options)
  );
}

export async function databaseQuery<T>(payload: DbQueryPayload): Promise<HttpResult<T>> {
  const requestPayload: DbActionPayload = {
    collection: payload.collection,
    action: payload.single === true ? 'findOne' : 'find',
    filter: payload.filter,
  };
  assignDefined(requestPayload, 'provider', normalizeDbProvider(payload.provider));
  assignDefined(requestPayload, 'collectionMap', payload.collectionMap);
  assignDefined(requestPayload, 'projection', payload.projection);
  assignDefined(requestPayload, 'sort', payload.sort);
  assignDefined(requestPayload, 'limit', payload.limit);
  assignDefined(requestPayload, 'idType', payload.idType);
  return apiPost<T>('/api/ai-paths/db-action', requestPayload, {
    timeoutMs: resolveDbActionTimeoutMs(),
  });
}

export async function databaseUpdate<T>(
  payload: DbUpdatePayload,
  options?: DbRequestOptions
): Promise<HttpResult<T>> {
  const requestPayload: DbActionPayload = {
    collection: payload.collection,
    action: payload.single === false ? 'updateMany' : 'updateOne',
    filter: payload.filter,
    update: payload.update,
  };
  assignDefined(requestPayload, 'provider', normalizeDbProvider(payload.provider));
  assignDefined(requestPayload, 'collectionMap', payload.collectionMap);
  assignDefined(requestPayload, 'idType', payload.idType);
  return apiPost<T>('/api/ai-paths/db-action', requestPayload, createDbRequestOptions(options));
}

export async function entityUpdate<T>(payload: EntityUpdatePayload): Promise<HttpResult<T>> {
  return apiPost<T>('/api/ai-paths/update', payload);
}

export async function fetchSchema(args?: {
  provider?: DbSchemaProvider;
  includeCounts?: boolean;
}): Promise<HttpResult<SchemaResponse>> {
  const params = new URLSearchParams();
  if (args?.provider !== undefined) params.set('provider', args.provider);
  if (args?.includeCounts === true) params.set('includeCounts', 'true');
  const query = params.toString();
  const url = query.length > 0 ? `/api/databases/schema?${query}` : '/api/databases/schema';
  return apiFetch<SchemaResponse>(url, {
    headers: await withApiCsrfHeaders(),
  });
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
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (query.length > 0) {
    params.set('query', query);
  }
  return apiFetch<DatabaseBrowse>(`/api/databases/browse?${params.toString()}`, {
    headers: await withApiCsrfHeaders(),
  });
}
