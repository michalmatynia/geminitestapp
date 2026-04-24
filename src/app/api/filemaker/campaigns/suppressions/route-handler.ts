export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'filemaker.campaigns.suppressions.GET',
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'filemaker.campaigns.suppressions.DELETE',
  requireAuth: true,
});
