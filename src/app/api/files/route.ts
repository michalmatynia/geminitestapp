export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'files.GET',
  querySchema,
  requireAuth: true,
});
