import { describe, expect, it } from 'vitest';

import {
  buildCsvImportResponse,
  csvImportPayloadSchema,
  requireCsvImportFile,
  toCsvImportProductInput,
} from './handler.helpers';

describe('product import csv handler helpers', () => {
  it('requires an uploaded csv file', () => {
    const file = new File(['SKU\nsku-1'], 'products.csv', { type: 'text/csv' });

    expect(requireCsvImportFile({ file })).toBe(file);
    expect(typeof csvImportPayloadSchema.safeParse).toBe('function');
    expect(() => requireCsvImportFile({ file: null })).toThrow('No file uploaded');
  });

  it('maps csv rows into product create input and skips rows without sku', () => {
    expect(
      toCsvImportProductInput({
        SKU: 'sku-1',
        'Name PL': ' Nazwa 1 ',
        'Name EN': ' Name 1 ',
        'Name DE': ' Name 1 DE ',
        'Cena sprzedaży Retail Online (in EUR)': '12',
        EN: 'Desc EN 1',
        DE: 'Desc DE 1',
        PL: 'Desc PL 1',
      })
    ).toEqual({
      sku: 'sku-1',
      name_pl: 'Nazwa 1',
      name_en: 'Name 1',
      name_de: 'Name 1 DE',
      price: 12,
      description_en: 'Desc EN 1',
      description_de: 'Desc DE 1',
      description_pl: 'Desc PL 1',
    });

    expect(toCsvImportProductInput({ SKU: '' })).toBeNull();
  });

  it('builds the capped import response summary', () => {
    expect(
      buildCsvImportResponse({
        total: 12,
        successful: 8,
        failed: 4,
        errors: Array.from({ length: 12 }, (_, index) => ({
          sku: `sku-${index + 1}`,
          error: `error-${index + 1}`,
        })),
      })
    ).toEqual({
      message: 'CSV import completed',
      summary: {
        total: 12,
        successful: 8,
        failed: 4,
        errors: Array.from({ length: 10 }, (_, index) => ({
          sku: `sku-${index + 1}`,
          error: `error-${index + 1}`,
        })),
      },
    });
  });
});
