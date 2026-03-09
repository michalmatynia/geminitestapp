export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { postProductsImportCsvHandler } from '@/app/api/v2/products/import/csv/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postProductsImportCsvHandler, {
  source: 'v2.products.import.csv.POST',
});
