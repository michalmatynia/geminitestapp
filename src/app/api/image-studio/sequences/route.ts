export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'image-studio.sequences.GET',
  querySchema,
});
