export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postDatabasesRestoreHandler } from './handler';

export const POST = apiHandler(
  postDatabasesRestoreHandler,
  { source: 'databases.restore.POST' }
);
