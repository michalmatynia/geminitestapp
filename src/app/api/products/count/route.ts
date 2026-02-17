export const runtime = 'nodejs';
export const revalidate = 30;

import {
  productFilterSchema,
} from '@/features/products/validations';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandler(
  GET_handler,
  {
    source: 'products.count.GET',
    querySchema: productFilterSchema,
  }
);
