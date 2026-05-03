
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'case-resolver.assets.extract-pdf.POST',
  requireAuth: true,
});
