
import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler as getCategoriesHandler } from '../categories/handler';
import { getHandler as getProducersHandler } from '../producers/handler';
import { getHandler as getTagsHandler } from '../tags/handler';

import type { NextRequest } from 'next/server';

type ResourceParams = { resource: string };

const MARKETPLACE_RESOURCE_HANDLERS: Record<string, ApiRouteHandler> = {
  categories: getCategoriesHandler,
  producers: getProducersHandler,
  tags: getTagsHandler,
};

const resolveHandler = (resource: string): ApiRouteHandler => {
  const handler = MARKETPLACE_RESOURCE_HANDLERS[resource];
  if (!handler) {
    throw notFoundError(`Unknown marketplace resource: ${resource}`);
  }
  return handler;
};

export const GET = apiHandlerWithParams<ResourceParams>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: ResourceParams): Promise<Response> =>
    resolveHandler(params.resource)(req, ctx),
  {
    source: 'marketplace.[resource].GET',
    cacheControl: 'no-store',
    requireAuth: true,
  }
);
