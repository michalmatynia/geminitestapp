export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import { postDatabasesRestoreHandler } from './handler';

export const POST = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    postDatabasesRestoreHandler(req, ctx),
  { source: 'databases.restore.POST' }
);
