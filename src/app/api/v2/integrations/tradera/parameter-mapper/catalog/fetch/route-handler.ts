import { POST_handler } from '@/app/api/v2/integrations/tradera/parameter-mapper/catalog/fetch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.integrations.tradera.parameter-mapper.catalog.fetch.POST',
  requireAuth: true,
});
