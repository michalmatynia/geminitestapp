export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { PUT_templates_item_handler, DELETE_templates_item_handler } from '../../handler';

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(PUT_templates_item_handler, {
  source: 'v2.templates.[type].[id].PUT',
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(DELETE_templates_item_handler, {
  source: 'v2.templates.[type].[id].DELETE',
});
