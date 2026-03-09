export const runtime = 'nodejs';

import { postProductsCatalogAssignHandler } from '@/app/api/v2/products/entities/catalogs/assign/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postProductsCatalogAssignHandler, {
  source: 'v2.products.entities.catalogs.assign.POST',
});
