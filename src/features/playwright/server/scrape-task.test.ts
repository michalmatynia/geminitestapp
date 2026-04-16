import { describe, expect, it } from 'vitest';

import { internalError } from '@/shared/errors/app-error';

import { runPlaywrightScrapeTask } from './scrape-task';

describe('playwright scrape task helper', () => {
  it('maps a Playwright scrape result through the shared adapter boundary', async () => {
    const result = await runPlaywrightScrapeTask({
      execute: async () => ({
        runId: 'run-123',
        run: {
          runId: 'run-123',
          status: 'completed',
        } as never,
        finalUrl: 'https://example.com/categories',
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
          categories: [{ id: '1' }],
        },
        outputs: {
          result: {
            categories: [{ id: '1' }],
          },
        },
        logs: [],
      }),
      mapResult: async (result) => ({
        runId: result.runId,
        finalUrl: result.finalUrl,
      }),
    });

    expect(result).toEqual({
      runId: 'run-123',
      finalUrl: 'https://example.com/categories',
    });
  });

  it('merges additional metadata into AppError failures', async () => {
    await expect(
      runPlaywrightScrapeTask({
        execute: async () => {
          throw internalError('Scrape task failed', {
            runId: 'run-123',
          });
        },
        mapResult: async () => null,
        buildErrorAdditional: async () => ({
          instanceKind: 'tradera_category_scrape',
        }),
      })
    ).rejects.toMatchObject({
      message: 'Scrape task failed',
      meta: {
        runId: 'run-123',
        instanceKind: 'tradera_category_scrape',
      },
    });
  });
});
