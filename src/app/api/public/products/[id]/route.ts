export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'public.products.[id].GET',
});
