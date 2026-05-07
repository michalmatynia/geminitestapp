import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from '@/features/database/server/api/engine/source/handler';

export const GET = apiHandler(getHandler, {
  source: 'database-engine-web.databases.engine.source.GET',
});
