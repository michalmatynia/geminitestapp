export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from '@/app/api/products/tags/all/handler';

export const GET = apiHandler(GET_handler, { source: 'products.tags.all.GET' });
