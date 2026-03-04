export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from '@/app/api/v2/products/migrate/handler';

export const GET = apiHandler(GET_handler, { source: 'products.migrate.GET' });
export const POST = apiHandler(POST_handler, { source: 'products.migrate.POST' });
