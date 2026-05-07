import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/app/api/settings/migrate/backfill-keys/handler';

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.settings.migrate.backfill-keys.POST',
});
