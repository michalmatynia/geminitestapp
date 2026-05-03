import {
  deleteHandler,
  getHandler,
  patchHandler,
  postHandler,
  putHandler,
  supplier1688SelectorRegistryDeleteRequestSchema,
  supplier1688SelectorRegistryProfileActionRequestSchema,
  supplier1688SelectorRegistrySaveRequestSchema,
  supplier1688SelectorRegistrySyncRequestSchema,
} from '@/app/api/v2/integrations/1688/selectors/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.1688.selectors.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.1688.selectors.POST',
  parseJsonBody: true,
  bodySchema: supplier1688SelectorRegistrySyncRequestSchema,
  requireAuth: true,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.integrations.1688.selectors.PUT',
  parseJsonBody: true,
  bodySchema: supplier1688SelectorRegistrySaveRequestSchema,
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'v2.integrations.1688.selectors.DELETE',
  parseJsonBody: true,
  bodySchema: supplier1688SelectorRegistryDeleteRequestSchema,
  requireAuth: true,
});

export const PATCH = apiHandler(patchHandler, {
  source: 'v2.integrations.1688.selectors.PATCH',
  parseJsonBody: true,
  bodySchema: supplier1688SelectorRegistryProfileActionRequestSchema,
  requireAuth: true,
});

