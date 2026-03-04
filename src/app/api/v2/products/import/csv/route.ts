export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postProductsImportCsvHandler } from '@/app/api/v2/products/import/csv/handler';

export const POST = apiHandler(postProductsImportCsvHandler, {
  source: 'products.import.csv.POST',
});
