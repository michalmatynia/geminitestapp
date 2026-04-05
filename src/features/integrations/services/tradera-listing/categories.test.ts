import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueuePlaywrightNodeRunMock,
  parsePersistedStorageStateMock,
  resolveConnectionPlaywrightSettingsMock,
  loadTraderaSystemSettingsMock,
} = vi.hoisted(() => ({
  enqueuePlaywrightNodeRunMock: vi.fn(),
  parsePersistedStorageStateMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  loadTraderaSystemSettingsMock: vi.fn(),
}));

vi.mock('@/features/ai/server', () => ({
  enqueuePlaywrightNodeRun: (...args: unknown[]) => enqueuePlaywrightNodeRunMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  parsePersistedStorageState: (...args: unknown[]) => parsePersistedStorageStateMock(...args),
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-system-settings', () => ({
  loadTraderaSystemSettings: (...args: unknown[]) => loadTraderaSystemSettingsMock(...args),
}));

import { fetchTraderaCategoriesForConnection } from './categories';

describe('fetchTraderaCategoriesForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parsePersistedStorageStateMock.mockReturnValue({
      cookies: [],
      origins: [],
    });
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      headless: true,
      slowMo: 0,
      timeout: 30_000,
      navigationTimeout: 30_000,
      humanizeMouse: false,
      mouseJitter: 6,
      clickDelayMin: 30,
      clickDelayMax: 120,
      inputDelayMin: 20,
      inputDelayMax: 120,
      actionDelayMin: 200,
      actionDelayMax: 900,
      proxyEnabled: false,
      proxyServer: '',
      proxyUsername: '',
      proxyPassword: '',
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
    loadTraderaSystemSettingsMock.mockResolvedValue({
      listingFormUrl: 'https://www.tradera.com/en/selling/new',
    });
  });

  it('runs the Playwright Engine scrape and returns normalized categories', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-123',
      status: 'completed',
      error: null,
      artifacts: [],
      logs: [],
      result: {
        outputs: {
          result: {
            categories: [
              { id: '100', name: 'Collectibles', parentId: null },
              { id: '101', name: 'Pins', parentId: '100' },
              { id: '101', name: 'Pins duplicate', parentId: '100' },
            ],
            categorySource: 'menu',
          },
        },
        finalUrl: 'https://www.tradera.com/en/selling/new',
      },
    });

    const result = await fetchTraderaCategoriesForConnection({
      id: 'connection-1',
      playwrightStorageState: 'encrypted-storage-state',
      playwrightPersonaId: 'persona-1',
    } as never);

    expect(result).toEqual([
      { id: '100', name: 'Collectibles', parentId: '0' },
      { id: '101', name: 'Pins', parentId: '100' },
    ]);
    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        browserEngine: 'chromium',
        preventNewPages: true,
        startUrl: 'https://www.tradera.com/en/selling/new',
        timeoutMs: 120_000,
        personaId: 'persona-1',
        contextOptions: {
          storageState: {
            cookies: [],
            origins: [],
          },
        },
        input: {
          connectionId: 'connection-1',
          traderaConfig: {
            listingFormUrl: 'https://www.tradera.com/en/selling/new',
          },
        },
      }),
      waitForResult: true,
    });
  });

  it('fails early when the browser session is missing', async () => {
    parsePersistedStorageStateMock.mockReturnValue(null);

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: null,
      } as never)
    ).rejects.toMatchObject({
      message:
        'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      httpStatus: 400,
    });

    expect(enqueuePlaywrightNodeRunMock).not.toHaveBeenCalled();
  });

  it('surfaces auth failures from the scraper as actionable auth errors', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-auth',
      status: 'failed',
      error:
        'Error: AUTH_REQUIRED: Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      artifacts: [],
      logs: ['[runtime] browser closed'],
      result: {
        outputs: {
          result: {
            currentUrl: 'https://www.tradera.com/en/login',
          },
        },
        finalUrl: 'https://www.tradera.com/en/login',
      },
    });

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      } as never)
    ).rejects.toMatchObject({
      message:
        'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      httpStatus: 401,
      meta: expect.objectContaining({
        connectionId: 'connection-1',
        recoveryAction: 'tradera_manual_login',
        recoveryMessage:
          'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      }),
    });
  });

  it('detects auth failures from runner logs when the top-level error is empty', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-auth-logs',
      status: 'failed',
      error: null,
      artifacts: [],
      logs: [
        '[runtime] Launching chromium browser.',
        '[runtime][error] Error: AUTH_REQUIRED: Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      ],
      result: {
        outputs: {
          result: {
            currentUrl: 'https://www.tradera.com/en/login',
          },
        },
        finalUrl: 'https://www.tradera.com/en/login',
      },
    });

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      } as never)
    ).rejects.toMatchObject({
      message:
        'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      httpStatus: 401,
      meta: expect.objectContaining({
        recoveryAction: 'tradera_manual_login',
      }),
    });
  });

  it('fails when the scrape completes without categories', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-empty',
      status: 'completed',
      error: null,
      artifacts: [{ name: 'tradera-category-empty', path: 'run-empty/tradera-category-empty.png' }],
      logs: ['[user] tradera.category.scrape.empty {}'],
      result: {
        outputs: {
          result: {
            categories: [],
            categorySource: 'menu',
            scrapedFrom: 'https://www.tradera.com/en/selling/new',
          },
        },
        finalUrl: 'https://www.tradera.com/en/selling/new',
      },
    });

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      } as never)
    ).rejects.toMatchObject({
      message:
        'Tradera categories could not be scraped from the listing page — the page structure may have changed. Configure Tradera API credentials (App ID and App Key) on the connection to fetch categories via the Tradera SOAP API instead.',
      httpStatus: 422,
    });
  });

  it('treats empty completed runs on Tradera verification pages as auth recovery errors', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-empty-auth',
      status: 'completed',
      error: null,
      artifacts: [{ name: 'tradera-category-auth-required', path: 'run-empty-auth/auth.png' }],
      logs: ['[user] tradera.category.scrape.auth-required {}'],
      result: {
        outputs: {
          result: {
            categories: [],
            categorySource: 'menu',
            scrapedFrom: 'https://www.tradera.com/en/verification',
            currentUrl: 'https://www.tradera.com/en/verification',
            errorText: 'Security check required before you can continue.',
          },
        },
        finalUrl: 'https://www.tradera.com/en/verification',
      },
    });

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      } as never)
    ).rejects.toMatchObject({
      message:
        'Stored Tradera session expired and Tradera requires manual verification. Refresh the saved browser session.',
      httpStatus: 401,
      meta: expect.objectContaining({
        recoveryAction: 'tradera_manual_login',
        currentUrl: 'https://www.tradera.com/en/verification',
      }),
    });
  });
});
