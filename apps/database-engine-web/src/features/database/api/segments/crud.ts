import {
  type CrudRequest,
  type CrudResult,
  type DatabaseEngineManagedMongoApplication,
  type DatabaseType,
  type MongoSource,
  type SqlQueryResult,
} from '@/shared/contracts/database';
import { api } from '@/shared/lib/api-client';

export const executeSqlQuery = async (input: {
  sql?: string;
  type: DatabaseType;
  application?: DatabaseEngineManagedMongoApplication | undefined;
  source?: MongoSource | undefined;
  collection?: string;
  operation?: string;
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
  skip?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}): Promise<SqlQueryResult> => api.post<SqlQueryResult>('/api/databases/execute', input);

export const executeCrudOperation = async (input: CrudRequest): Promise<CrudResult> =>
  api.post<CrudResult>('/api/databases/crud', input);
