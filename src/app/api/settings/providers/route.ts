
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from '@/shared/server/api/settings/providers/handler';

export const GET = apiHandler(getHandler, {
  source: 'settings.providers.GET',
  requireAuth: true,
});
