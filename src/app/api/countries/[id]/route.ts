export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PUT_handler, countrySchema } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'countries.[id].PUT',
  parseJsonBody: true,
  bodySchema: countrySchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'countries.[id].DELETE',
});
