import { z } from 'zod';

import type { CreateProductInput, ProductCsvImportResponse } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

export interface CsvRow {
  [key: string]: string;
}

export const csvImportPayloadSchema = z.object({
  file: z.custom<File>(
    (value): value is File => typeof File !== 'undefined' && value instanceof File,
    'CSV file is required'
  ),
});

export const requireCsvImportFile = (payload: { file: unknown }): File => {
  const parsedPayload = csvImportPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw badRequestError('No file uploaded', {
      issues: parsedPayload.error.flatten(),
    });
  }

  return parsedPayload.data.file;
};

export const toCsvImportProductInput = (row: CsvRow): CreateProductInput | null => {
  const sku = row['SKU'];
  if (!sku) return null;

  return {
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
};

export const buildCsvImportResponse = ({
  total,
  successful,
  failed,
  errors,
}: {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ sku: string; error: string }>;
}): ProductCsvImportResponse => ({
  message: 'CSV import completed',
  summary: {
    total,
    successful,
    failed,
    errors: errors.slice(0, 10),
  },
});
