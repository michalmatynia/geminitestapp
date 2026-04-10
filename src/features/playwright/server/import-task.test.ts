import { describe, expect, it } from 'vitest';

import { internalError } from '@/shared/errors/app-error';

import { runPlaywrightImportTask } from './import-task';

describe('playwright import task helper', () => {
  it('maps a Playwright import result through the shared adapter boundary', async () => {
    const result = await runPlaywrightImportTask({
      execute: async () => ({
        products: [
          {
            sku: 'PW-001',
            title: 'Imported product',
          },
        ],
        rawResult: {
          result: [{ sku: 'PW-001' }],
        },
      }),
      mapResult: async (result) => ({
        productCount: result.products.length,
        firstSku: result.products[0]?.['sku'] ?? null,
      }),
    });

    expect(result).toEqual({
      productCount: 1,
      firstSku: 'PW-001',
    });
  });

  it('merges additional metadata into AppError failures', async () => {
    await expect(
      runPlaywrightImportTask({
        execute: async () => {
          throw internalError('Programmable import failed', {
            runId: 'run-import-123',
          });
        },
        mapResult: async () => null,
        buildErrorAdditional: async () => ({
          scriptMode: 'programmable-import',
        }),
      })
    ).rejects.toMatchObject({
      message: 'Programmable import failed',
      meta: {
        runId: 'run-import-123',
        scriptMode: 'programmable-import',
      },
    });
  });
});
