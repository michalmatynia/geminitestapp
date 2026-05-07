export const runtime = 'nodejs';
export const revalidate = 86400;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getDatabasesSchemaHandler, querySchema } from './handler';

export const GET = apiHandler(getDatabasesSchemaHandler, {
  source: 'databases.schema.GET',
  cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
  querySchema,
});
