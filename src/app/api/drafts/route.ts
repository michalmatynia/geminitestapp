
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'drafts.GET',
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'drafts.POST',
  requireAuth: true,
});
