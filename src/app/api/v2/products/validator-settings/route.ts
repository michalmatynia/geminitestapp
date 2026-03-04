export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, PUT_handler, updateValidatorSettingsSchema } from '@/app/api/products/validator-settings/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.validator-settings.GET',
  cacheControl: 'no-store',
});

export const PUT = apiHandler(PUT_handler, {
  source: 'products.validator-settings.PUT',
  parseJsonBody: true,
  bodySchema: updateValidatorSettingsSchema,
});
