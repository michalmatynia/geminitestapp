import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { CreateProductDto } from '@/shared/contracts/products';

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

  const CHUNK_SIZE = 50;
  let successful = 0;
  let failed = 0;
  const errors: Array<{ sku: string; error: string }> = [];
  const pendingBatch: CreateProductDto[] = [];

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
        service: 'csv-import',
        error: message,
      });
    }
    pendingBatch.length = 0;
  };

  for (const row of parsed.data) {
    const sku = row['SKU'];
    if (!sku) continue;

    const productData = {
      sku,
      name: {
        pl: (row['Name PL'] ?? '').toString().trim(),
        en: (row['Name EN'] ?? '').toString().trim(),
        de: (row['Name DE'] ?? '').toString().trim(),
      },
      description: {
        en: `${row['EN']}`,
        de: `${row['DE']}`,
        pl: `${row['PL']}`,
      },
      name_pl: (row['Name PL'] ?? '').toString().trim(),
      name_en: (row['Name EN'] ?? '').toString().trim(),
      name_de: (row['Name DE'] ?? '').toString().trim(),
      price: row['Cena sprzedaży Retail Online (in EUR)']
        ? parseInt(row['Cena sprzedaży Retail Online (in EUR)'])
        : 0,
      description_en: `${row['EN']}`,
      description_de: `${row['DE']}`,
      description_pl: `${row['PL']}`,
      catalogId: 'default',
      published: true,
    } as unknown as CreateProductDto;

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

export const POST = apiHandler(POST_handler, { source: 'import.POST' });
