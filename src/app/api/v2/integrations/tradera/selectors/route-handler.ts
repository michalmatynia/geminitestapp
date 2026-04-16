import {
  deleteHandler,
  getHandler,
  patchHandler,
  postHandler,
  putHandler,
  traderaSelectorRegistryDeleteRequestSchema,
  traderaSelectorRegistryProfileActionRequestSchema,
  traderaSelectorRegistrySaveRequestSchema,
  traderaSelectorRegistrySyncRequestSchema,
} from '@/app/api/v2/integrations/tradera/selectors/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.tradera.selectors.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.tradera.selectors.POST',
  parseJsonBody: true,
  bodySchema: traderaSelectorRegistrySyncRequestSchema,
  requireAuth: true,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.integrations.tradera.selectors.PUT',
  parseJsonBody: true,
  bodySchema: traderaSelectorRegistrySaveRequestSchema,
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'v2.integrations.tradera.selectors.DELETE',
  parseJsonBody: true,
  bodySchema: traderaSelectorRegistryDeleteRequestSchema,
  requireAuth: true,
});

export const PATCH = apiHandler(patchHandler, {
  source: 'v2.integrations.tradera.selectors.PATCH',
  parseJsonBody: true,
  bodySchema: traderaSelectorRegistryProfileActionRequestSchema,
  requireAuth: true,
});
