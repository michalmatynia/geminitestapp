import { describe, expect, it } from 'vitest';

import {
  buildPlaywrightListingResult,
  buildPlaywrightScriptListingMetadata,
} from './listing-result';

describe('playwright listing result helpers', () => {
  it('builds the shared browser listing result shell', () => {
    expect(
      buildPlaywrightListingResult({
        externalListingId: 'external-1',
        listingUrl: 'https://example.com/item/1',
        completedAt: '2026-04-10T18:00:00.000Z',
        metadata: {
          source: 'scripted',
        },
      })
    ).toEqual({
      externalListingId: 'external-1',
      listingUrl: 'https://example.com/item/1',
      completedAt: '2026-04-10T18:00:00.000Z',
      metadata: {
        source: 'scripted',
      },
    });
  });

  it('builds shared scripted listing metadata from a Playwright run result', () => {
    expect(
      buildPlaywrightScriptListingMetadata({
        result: {
          runId: 'run-123',
          effectiveBrowserMode: 'headed',
          personaId: 'persona-1',
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
            stage: 'publish',
            currentUrl: 'https://example.com/item/1',
          },
          publishVerified: true,
        },
        requestedBrowserMode: 'headed',
        additional: {
          source: 'programmable',
        },
      })
    ).toEqual({
      runId: 'run-123',
      requestedBrowserMode: 'headed',
      browserMode: 'headed',
      playwrightPersonaId: 'persona-1',
      playwrightSettings: expect.objectContaining({
        headless: false,
        deviceName: 'Desktop Chrome',
      }),
      rawResult: {
        stage: 'publish',
        currentUrl: 'https://example.com/item/1',
      },
      latestStage: 'publish',
      latestStageUrl: 'https://example.com/item/1',
      publishVerified: true,
      source: 'programmable',
    });
  });
});
