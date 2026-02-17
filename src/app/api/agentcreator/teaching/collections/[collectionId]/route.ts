export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PATCH_handler } from './handler';

export const PATCH = apiHandler(PATCH_handler, {
  source: 'agentcreator.teaching.collections.PATCH',
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'agentcreator.teaching.collections.DELETE',
});
