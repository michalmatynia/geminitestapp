export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.integrations.imports.base.sample-product.GET',
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.integrations.imports.base.sample-product.POST',
  requireCsrf: false,
});
