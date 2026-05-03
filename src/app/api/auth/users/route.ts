
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'auth.users.GET',
});
