export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { commonListQuerySchema } from '@/shared/validations/api-schemas';

import { GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'system.activity.GET',
  querySchema: commonListQuerySchema,
  requireAuth: true,
});
