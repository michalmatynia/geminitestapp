export const runtime = 'nodejs';


import type { ApiHandlerContext, ApiRouteHandler } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler as getCategoriesHandler } from '../categories/handler';
import { GET_handler as getProducersHandler } from '../producers/handler';
import { GET_handler as getTagsHandler } from '../tags/handler';

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
    source: 'marketplace.resource.GET',
    cacheControl: 'no-store',
  }
);
