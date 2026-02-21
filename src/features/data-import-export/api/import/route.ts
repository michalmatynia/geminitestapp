import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

import { ErrorSystem } from '@/features/observability/server';
import { getProductRepository, productCreateSchema } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';

interface CsvRow {
  [key: string]: string;
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    throw badRequestError('No file uploaded');
  }

  const text = await file.text();

  const parsed = Papa.parse<CsvRow>(text, { header: true });
  const productRepository = await getProductRepository();

  let successful = 0;
  let failed = 0;
  const errors: Array<{ sku: string; error: string }> = [];

  for (const row of parsed.data) {
    const sku = row['SKU'];
    // Filter out entries with null or empty sku
    if (!sku) continue;

    const productData = {
      sku,
      name_pl: (row['Name PL'] ?? '').toString().trim(),
      name_en: (row['Name EN'] ?? '').toString().trim(),
      name_de: (row['Name DE'] ?? '').toString().trim(),
      price: row['Cena sprzedaży Retail Online (in EUR)']
        ? parseInt(row['Cena sprzedaży Retail Online (in EUR)'])
        : 0,
      description_en: `${row['EN']}`,
      description_de: `${row['DE']}`,
      description_pl: `${row['PL']}`,
    };

    try {
      const validated = productCreateSchema.parse(productData);
      await productRepository.createProduct(validated);
      successful++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ sku, error: message });
      
      void ErrorSystem.logWarning(`Failed to import product row for SKU: ${sku}`, {
        service: 'csv-import',
        sku,
        error: message
      });
    }
  }

  return NextResponse.json({ 
    message: 'CSV import completed',
    summary: {
      total: parsed.data.length,
      successful,
      failed,
      errors: errors.slice(0, 10) // Only return first 10 errors to keep response size reasonable
    }
  });
}

export const POST = apiHandler(POST_handler, { source: 'import.POST' });
