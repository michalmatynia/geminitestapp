import {
  type CrudRequest,
  type CrudResult,
  type DatabaseType,
  type SqlQueryResult,
} from '@/shared/contracts/database';
import { api } from '@/shared/lib/api-client';

export const executeSqlQuery = async (input: {
  sql?: string;
  type: DatabaseType;
  collection?: string;
  operation?: string;
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
}): Promise<SqlQueryResult> => api.post<SqlQueryResult>('/api/databases/execute', input);

export const executeCrudOperation = async (input: CrudRequest): Promise<CrudResult> =>
  api.post<CrudResult>('/api/databases/crud', input);
