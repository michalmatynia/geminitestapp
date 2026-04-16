import { describe, expect, it } from 'vitest';

import { internalError } from '@/shared/errors/app-error';

import { runPlaywrightListingTask } from './listing-task';

describe('playwright listing task helper', () => {
  it('maps a Playwright listing result through the shared adapter boundary', async () => {
    const result = await runPlaywrightListingTask({
      execute: async () => ({
        runId: 'run-123',
        externalListingId: 'listing-123',
        listingUrl: 'https://example.com/item/123',
        expiresAt: null,
        publishVerified: true,
        effectiveBrowserMode: 'headed',
        personaId: null,
        executionSettings: {
          headless: false,
          slowMo: 0,
          timeout: 30_000,
          navigationTimeout: 30_000,
          humanizeMouse: false,
          mouseJitter: 0,
          clickDelayMin: 0,
          clickDelayMax: 0,
          inputDelayMin: 0,
          inputDelayMax: 0,
          actionDelayMin: 0,
          actionDelayMax: 0,
          proxyEnabled: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        rawResult: {
          publishVerified: true,
        },
        logs: [],
      }),
      mapResult: async (result) => ({
        externalListingId: result.externalListingId,
        listingUrl: result.listingUrl,
        browserMode: result.effectiveBrowserMode,
      }),
    });

    expect(result).toEqual({
      externalListingId: 'listing-123',
      listingUrl: 'https://example.com/item/123',
      browserMode: 'headed',
    });
  });

  it('merges additional metadata into AppError failures', async () => {
    await expect(
      runPlaywrightListingTask({
        execute: async () => {
          throw internalError('Scripted listing failed', {
            runId: 'run-123',
          });
        },
        mapResult: async () => null,
        buildErrorAdditional: async () => ({
          scriptMode: 'scripted',
        }),
      })
    ).rejects.toMatchObject({
      message: 'Scripted listing failed',
      meta: {
        runId: 'run-123',
        scriptMode: 'scripted',
      },
    });
  });
});
