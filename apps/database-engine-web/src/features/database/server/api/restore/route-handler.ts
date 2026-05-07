export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postDatabasesRestoreHandler, querySchema } from './handler';

export const POST = apiHandler(postDatabasesRestoreHandler, {
  source: 'database-engine-web.databases.restore.POST',
  querySchema,
});
