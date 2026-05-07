import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from '@/app/api/auth/[...nextauth]/handler';

export const GET = apiHandlerWithParams<{ nextauth: string[] }>(
  async (request, ctx, params) => getHandler(request, { ...ctx, params }),
  {
    source: 'database-engine-web.auth.[...nextauth].GET',
  }
);

export const POST = apiHandlerWithParams<{ nextauth: string[] }>(
  async (request, ctx, params) => postHandler(request, { ...ctx, params }),
  {
    source: 'database-engine-web.auth.[...nextauth].POST',
    requireCsrf: false,
  }
);
