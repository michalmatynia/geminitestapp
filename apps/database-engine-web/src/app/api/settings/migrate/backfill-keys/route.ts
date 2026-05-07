import { apiHandler } from '@/shared/lib/api/api-handler';

import { postBackfillKeysHandler } from '../../../../../server/settings/handlers';

export const POST = apiHandler(postBackfillKeysHandler, {
  source: 'database-engine-web.settings.migrate.backfill-keys.POST',
});
