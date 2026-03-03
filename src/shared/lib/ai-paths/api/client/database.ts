import { 
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

export async function fetchSchema(args: {
  provider: string;
  collection: string;
}): Promise<ApiResponse<SchemaResponsePayloadDto>> {
  return apiPost<SchemaResponsePayloadDto>('/api/databases/schema', args);
}

export async function browseDatabase(args: {
  provider: string;
  collection: string;
  filter?: unknown;
  sort?: unknown;
  limit?: number;
  skip?: number;
}): Promise<ApiResponse<DatabaseBrowseDto>> {
  return apiPost<DatabaseBrowseDto>('/api/databases/browse', args);
}
