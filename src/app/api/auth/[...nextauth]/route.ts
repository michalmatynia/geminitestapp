import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const runtime = 'nodejs';

export const GET = apiHandlerWithParams<{ nextauth: string[] }>(
  async (request, ctx, params) => GET_handler(request, { ...ctx, params }),
  {
    source: 'auth.[...nextauth].GET',
  }
);
export const POST = apiHandlerWithParams<{ nextauth: string[] }>(
  async (request, ctx, params) => POST_handler(request, { ...ctx, params }),
  {
    source: 'auth.[...nextauth].POST',
    requireCsrf: false,
  }
);
