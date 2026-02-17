export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';

import { DELETE_handler, PUT_handler, currencySchema } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'currencies.[id].PUT',
  paramsSchema: idParamSchema,
  parseJsonBody: true,
  bodySchema: currencySchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'currencies.[id].DELETE',
  paramsSchema: idParamSchema,
});
