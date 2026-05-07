
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/shared/server/api/settings/database/sync/handler';

export const POST = apiHandler(postHandler, {
  source: 'settings.database.sync.POST',
});
