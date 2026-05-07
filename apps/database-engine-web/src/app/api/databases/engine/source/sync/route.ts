import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/features/database/server/api/engine/source/sync/handler';

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.databases.engine.source.sync.POST',
});
