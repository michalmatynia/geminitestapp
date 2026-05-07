import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from '@/app/api/settings/providers/handler';

export const GET = apiHandler(getHandler, {
  source: 'database-engine-web.settings.providers.GET',
  requireAuth: true,
});
