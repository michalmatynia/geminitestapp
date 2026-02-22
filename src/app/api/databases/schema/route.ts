export const runtime = 'nodejs';
export const revalidate = 3600;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getDatabasesSchemaHandler } from './handler';

export const GET = apiHandler(getDatabasesSchemaHandler as any, {
  source: 'database.schema.GET',
});
