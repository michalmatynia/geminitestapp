import type { Collection } from 'mongodb';

import type { AiPathsDbAction } from '@/shared/contracts/ai-paths';
import type { DbActionRequestedProvider, DbProvider } from './handler.helpers';

export type MongoActionContext = {
  provider: DbProvider;
  requestedProvider: DbActionRequestedProvider;
  collectionRef: Collection;
  resolvedCollection: string;
  action: AiPathsDbAction;
  filter: unknown;
  idType?: string;
  projection?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  limit: number;
  distinctField?: string;
  pipeline?: unknown[];
  document?: unknown;
  documents?: unknown;
  update?: unknown;
  upsert?: boolean;
  returnDocument: 'before' | 'after';
};
