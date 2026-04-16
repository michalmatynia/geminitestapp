
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'case-resolver.ocr.observability.GET',
  querySchema,
  requireAuth: true,
});
