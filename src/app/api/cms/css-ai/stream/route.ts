
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'cms.css-ai.stream.POST',
  requireAuth: true,
});
