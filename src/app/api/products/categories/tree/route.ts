export const runtime = 'nodejs';
export const revalidate = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.categories.tree.GET',
});
