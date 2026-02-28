export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_templates_handler, POST_templates_handler } from '../handler';

export const GET = apiHandlerWithParams(GET_templates_handler, {
  source: 'templates.GET',
});

export const POST = apiHandlerWithParams(POST_templates_handler, {
  source: 'templates.POST',
});
