export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'filemaker.cvs.GET',
});

export const POST = apiHandler(postHandler, {
  source: 'filemaker.cvs.POST',
});
