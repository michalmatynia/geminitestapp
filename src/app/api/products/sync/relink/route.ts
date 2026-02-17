export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, relinkSchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'products.sync.relink.POST',
  parseJsonBody: true,
  bodySchema: relinkSchema,
});
