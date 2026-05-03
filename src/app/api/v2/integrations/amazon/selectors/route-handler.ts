import {
  amazonSelectorRegistryDeleteRequestSchema,
  amazonSelectorRegistryProfileActionRequestSchema,
  amazonSelectorRegistrySaveRequestSchema,
  amazonSelectorRegistrySyncRequestSchema,
  deleteHandler,
  getHandler,
  patchHandler,
  postHandler,
  putHandler,
} from '@/app/api/v2/integrations/amazon/selectors/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.amazon.selectors.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.amazon.selectors.POST',
  parseJsonBody: true,
  bodySchema: amazonSelectorRegistrySyncRequestSchema,
  requireAuth: true,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.integrations.amazon.selectors.PUT',
  parseJsonBody: true,
  bodySchema: amazonSelectorRegistrySaveRequestSchema,
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'v2.integrations.amazon.selectors.DELETE',
  parseJsonBody: true,
  bodySchema: amazonSelectorRegistryDeleteRequestSchema,
  requireAuth: true,
});

export const PATCH = apiHandler(patchHandler, {
  source: 'v2.integrations.amazon.selectors.PATCH',
  parseJsonBody: true,
  bodySchema: amazonSelectorRegistryProfileActionRequestSchema,
  requireAuth: true,
});
