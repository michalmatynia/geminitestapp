export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.ai-paths.description-context.GET',
});
