
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'marketplace.mappings.bulk.POST',
  requireAuth: true,
});
