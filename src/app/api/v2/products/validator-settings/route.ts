export const runtime = 'nodejs';

import {
  GET_handler,
  PUT_handler,
  updateValidatorSettingsSchema,
} from '@/app/api/v2/products/validator-settings/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.validator-settings.GET',
  cacheControl: 'no-store',
});

export const PUT = apiHandler(PUT_handler, {
  source: 'v2.products.validator-settings.PUT',
  parseJsonBody: true,
  bodySchema: updateValidatorSettingsSchema,
});
