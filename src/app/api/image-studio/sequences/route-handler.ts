export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'image-studio.sequences.GET',
  querySchema,
  requireAuth: true,
});
