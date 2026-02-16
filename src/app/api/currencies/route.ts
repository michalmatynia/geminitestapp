export const runtime = 'nodejs';
export const revalidate = 3600;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, currencySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'currencies.GET',
});

export const POST = apiHandler(POST_handler, {
  source: 'currencies.POST',
  parseJsonBody: true,
  bodySchema: currencySchema,
});
