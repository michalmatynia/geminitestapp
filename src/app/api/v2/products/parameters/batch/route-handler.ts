export const runtime = 'nodejs';

import { postHandler, batchDeleteParametersSchema } from '@/app/api/v2/products/parameters/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postHandler, {
  source: 'v2.products.parameters.batch.POST',
  parseJsonBody: true,
  bodySchema: batchDeleteParametersSchema,
  requireAuth: true,
});
