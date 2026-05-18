import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'assets3d.milkbar.link-to-file.POST',
  requireAuth: true,
});
