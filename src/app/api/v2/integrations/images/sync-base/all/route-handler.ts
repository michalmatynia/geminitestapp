export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.images.sync-base.all.POST',
  requireCsrf: false,
  requireAuth: true,
});
