import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

import type { CreateProductInput } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

interface CsvRow {
  [key: string]: string;
}

const CHUNK_SIZE = 50;

export async function postProductsImportCsvHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw badRequestError('No file uploaded');
  }

  const text = await file.text();
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
  });

  let successful = 0;
  let failed = 0;
  const errors: Array<{ sku: string; error: string }> = [];
  const pendingBatch: CreateProductInput[] = [];

  const flushBatch = async (): Promise<void> => {
    if (pendingBatch.length === 0) return;

    try {
      const { productService } = await import('@/features/products/server');
      const createdCount = await productService.bulkCreateProducts(pendingBatch);
      successful += createdCount;
      failed += pendingBatch.length - createdCount;
    } catch (error) {
      failed += pendingBatch.length;
      const message = error instanceof Error ? error.message : 'Batch creation failed';
      void ErrorSystem.logWarning(`Failed to import batch of ${pendingBatch.length} products`, {
        service: 'csv-import-v2',
        error: message,
      });
    }

    pendingBatch.length = 0;
  };

  for (const row of parsed.data) {
    const sku = row['SKU'];
    if (!sku) continue;

    const productData: CreateProductInput = {
      sku,
      name_pl: (row['Name PL'] ?? '').toString().trim(),
      name_en: (row['Name EN'] ?? '').toString().trim(),
      name_de: (row['Name DE'] ?? '').toString().trim(),
      price: row['Cena sprzedaży Retail Online (in EUR)']
        ? parseInt(row['Cena sprzedaży Retail Online (in EUR)'], 10)
        : 0,
      description_en: `${row['EN']}`,
      description_de: `${row['DE']}`,
      description_pl: `${row['PL']}`,
    };

    pendingBatch.push(productData);
    if (pendingBatch.length >= CHUNK_SIZE) {
      await flushBatch();
    }
  }

  await flushBatch();

  return NextResponse.json({
    message: 'CSV import completed',
    summary: {
      total: parsed.data.length,
      successful,
      failed,
      errors: errors.slice(0, 10),
    },
  });
}
