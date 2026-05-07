import { apiHandler } from '@/shared/lib/api/api-handler';

import { getProvidersHandler } from '../../../../server/settings/handlers';

export const GET = apiHandler(getProvidersHandler, {
  source: 'database-engine-web.settings.providers.GET',
  requireAuth: true,
});
