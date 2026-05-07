
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/shared/server/api/settings/migrate/backfill-keys/handler';

export const POST = apiHandler(postHandler, {
  source: 'settings.migrate.backfill-keys.POST',
});
