export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'products.[id].studio.link.POST',
  paramsSchema: idParamSchema,
  logSuccess: true,
});
