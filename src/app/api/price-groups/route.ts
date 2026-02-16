export const runtime = 'nodejs';
export const revalidate = 600;

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import {
  getPriceGroupsHandler,
  postPriceGroupsHandler,
} from './handler';

export const GET = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    getPriceGroupsHandler(req, ctx),
  { source: 'price-groups.GET' }
);

export const POST = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    postPriceGroupsHandler(req, ctx),
  { source: 'price-groups.POST' }
);
