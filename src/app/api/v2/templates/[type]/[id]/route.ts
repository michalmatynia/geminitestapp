export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { PUT_templates_item_handler, DELETE_templates_item_handler } from '../../handler';

export const PUT = apiHandlerWithParams(PUT_templates_item_handler, {
  source: 'templates.item.PUT',
});

export const DELETE = apiHandlerWithParams(DELETE_templates_item_handler, {
  source: 'templates.item.DELETE',
});

