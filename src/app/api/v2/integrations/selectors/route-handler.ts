import {
  deleteHandler,
  getHandler,
  patchHandler,
  postHandler,
  putHandler,
  selectorRegistryDeleteRequestSchema,
  selectorRegistryProfileActionRequestSchema,
  selectorRegistrySaveRequestSchema,
  selectorRegistrySyncRequestSchema,
} from '@/app/api/v2/integrations/selectors/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.selectors.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.selectors.POST',
  parseJsonBody: true,
  bodySchema: selectorRegistrySyncRequestSchema,
  requireAuth: true,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.integrations.selectors.PUT',
  parseJsonBody: true,
  bodySchema: selectorRegistrySaveRequestSchema,
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'v2.integrations.selectors.DELETE',
  parseJsonBody: true,
  bodySchema: selectorRegistryDeleteRequestSchema,
  requireAuth: true,
});

export const PATCH = apiHandler(patchHandler, {
  source: 'v2.integrations.selectors.PATCH',
  parseJsonBody: true,
  bodySchema: selectorRegistryProfileActionRequestSchema,
  requireAuth: true,
});
