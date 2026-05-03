import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandlerWithParams<{ nextauth: string[] }>(
  async (request, ctx, params) => getHandler(request, { ...ctx, params }),
  {
    source: 'auth.[...nextauth].GET',
  }
);
export const POST = apiHandlerWithParams<{ nextauth: string[] }>(
  async (request, ctx, params) => postHandler(request, { ...ctx, params }),
  {
    source: 'auth.[...nextauth].POST',
    requireCsrf: false,
  }
);
