import { apiHandler } from '@/shared/lib/api/api-handler';

import { postDatabaseSyncHandler } from '../../../../../server/settings/handlers';

export const POST = apiHandler(postDatabaseSyncHandler, {
  source: 'database-engine-web.settings.database.sync.POST',
});
