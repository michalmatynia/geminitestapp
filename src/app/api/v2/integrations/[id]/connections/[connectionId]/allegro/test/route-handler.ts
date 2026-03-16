export const runtime = 'nodejs';

import { z } from 'zod';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

const requestSchema = z.object({}).passthrough();

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(POST_handler, {
  source: 'v2.integrations.[id].connections.[connectionId].allegro.test.POST',
  requireCsrf: false,
  requireAuth: true,
  parseJsonBody: true,
  bodySchema: requestSchema,
});
