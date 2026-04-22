export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.imports.base.sample-product.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.imports.base.sample-product.POST',
  requireAuth: true,
  requireCsrf: false,
});
