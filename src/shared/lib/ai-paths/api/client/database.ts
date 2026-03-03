import { 
  apiFetch,
  apiPost, 
  ApiResponse 
} from './base';
import type { 
  DatabaseBrowseDto, 
  SchemaResponsePayloadDto 
} from '@/shared/contracts/database';

export type DbActionPayload = {
  provider?: 'auto' | 'mongodb' | 'prisma';
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
  provider: string;
  collection: string;
  collectionMap?: Record<string, string>;
  query: unknown;
  projection?: unknown;
  sort?: unknown;
  limit?: number;
  single?: boolean;
  idType?: string | undefined;
};

export type DbUpdatePayload = {
  provider: string;
  collection: string;
  collectionMap?: Record<string, string>;
  query: unknown;
  updates: unknown;
  single?: boolean;
  idType?: string;
};

export type EntityUpdatePayload = {
  entityType: string;
  entityId?: string;
  updates: unknown;
  mode?: 'replace' | 'append';
};

export async function databaseAction<T>(payload: DbActionPayload): Promise<ApiResponse<T>> {
  return apiPost<T>('/api/databases/action', payload);
}

export async function databaseQuery<T>(payload: DbQueryPayload): Promise<ApiResponse<T>> {
  return apiPost<T>('/api/databases/query', payload);
}

export async function databaseUpdate<T>(payload: DbUpdatePayload): Promise<ApiResponse<T>> {
  return apiPost<T>('/api/databases/update', payload);
}

export async function entityUpdate<T>(payload: EntityUpdatePayload): Promise<ApiResponse<T>> {
  return apiPost<T>('/api/databases/entity-update', payload);
}

export async function fetchSchema(args?: {
  provider?: string;
  includeCounts?: boolean;
}): Promise<ApiResponse<SchemaResponsePayloadDto>> {
  const params = new URLSearchParams();
  if (args?.provider) params.set('provider', args.provider);
  if (args?.includeCounts) params.set('includeCounts', 'true');
  const query = params.toString();
  const url = query ? `/api/databases/schema?${query}` : '/api/databases/schema';
  return apiFetch<SchemaResponsePayloadDto>(url);
}

export async function browseDatabase(args: {
  provider?: string;
  collection: string;
  query?: string;
  limit?: number;
  skip?: number;
}): Promise<ApiResponse<DatabaseBrowseDto>> {
  const params = new URLSearchParams();
  params.set('collection', args.collection);
  params.set('provider', args.provider ?? 'auto');
  if (typeof args.limit === 'number') params.set('limit', String(args.limit));
  if (typeof args.skip === 'number') params.set('skip', String(args.skip));
  if (typeof args.query === 'string' && args.query.trim()) {
    params.set('query', args.query.trim());
  }
  return apiFetch<DatabaseBrowseDto>(`/api/databases/browse?${params.toString()}`);
}
