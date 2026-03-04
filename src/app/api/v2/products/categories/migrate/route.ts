export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from '@/app/api/products/categories/migrate/handler';

export const POST = apiHandler(POST_handler, { source: 'products.categories.migrate.POST' });
