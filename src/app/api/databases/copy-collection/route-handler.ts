export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'databases.copy-collection.POST',
});

export const GET = apiHandler(getHandler, {
  source: 'databases.copy-collection.GET',
});
