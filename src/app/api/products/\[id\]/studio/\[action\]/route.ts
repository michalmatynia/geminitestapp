export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { studio_action_handler } from '../action_handler';

export const GET = apiHandlerWithParams(studio_action_handler, {
  source: 'products.studio.action.GET',
});

export const POST = apiHandlerWithParams(studio_action_handler, {
  source: 'products.studio.action.POST',
});
