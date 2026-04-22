
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'notes.notebooks.GET',
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'notes.notebooks.POST',
  requireAuth: true,
});
