export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.integrations.images.sync-base.all.POST',
  requireCsrf: false,
  requireAuth: true,
});
