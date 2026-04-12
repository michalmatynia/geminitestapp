export const runtime = 'nodejs';

import { POST_handler, batchDeleteParametersSchema } from '@/app/api/v2/products/parameters/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.parameters.batch.POST',
  parseJsonBody: true,
  bodySchema: batchDeleteParametersSchema,
  requireAuth: true,
});
