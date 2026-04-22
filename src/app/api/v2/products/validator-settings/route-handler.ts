export const runtime = 'nodejs';

import {
  getHandler,
  putHandler,
  updateValidatorSettingsSchema,
} from '@/app/api/v2/products/validator-settings/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.validator-settings.GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.products.validator-settings.PUT',
  parseJsonBody: true,
  bodySchema: updateValidatorSettingsSchema,
  requireAuth: true,
});
