import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/app/api/settings/database/sync/handler';

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.settings.database.sync.POST',
});
