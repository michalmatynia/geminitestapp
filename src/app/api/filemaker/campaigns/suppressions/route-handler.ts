export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'filemaker.campaigns.suppressions.GET',
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'filemaker.campaigns.suppressions.DELETE',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'filemaker.campaigns.suppressions.POST',
  requireAuth: true,
});
