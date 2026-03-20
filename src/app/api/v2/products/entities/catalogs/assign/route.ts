export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postProductsCatalogAssignHandler } from '@/app/api/v2/products/entities/catalogs/assign/handler';

export const POST = apiHandler(postProductsCatalogAssignHandler, {
  source: 'v2.products.entities.catalogs.assign.POST',
});
