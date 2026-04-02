import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueuePlaywrightNodeRunMock,
  resolveConnectionPlaywrightSettingsMock,
  parsePersistedStorageStateMock,
} = vi.hoisted(() => ({
  enqueuePlaywrightNodeRunMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  parsePersistedStorageStateMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/playwright-node-runner', () => ({
  enqueuePlaywrightNodeRun: (...args: unknown[]) =>
    enqueuePlaywrightNodeRunMock(...args) as Promise<unknown>,
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args) as Promise<unknown>,
  parsePersistedStorageState: (...args: unknown[]) =>
    parsePersistedStorageStateMock(...args) as unknown,
}));

import { runPlaywrightListingScript } from './runner';

describe('runPlaywrightListingScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      headless: true,
      slowMo: 0,
      timeout: 30000,
      navigationTimeout: 30000,
      proxyEnabled: false,
      proxyServer: '',
      proxyUsername: '',
      proxyPassword: '',
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
    parsePersistedStorageStateMock.mockReturnValue({
      cookies: [{ name: 'session', value: 'abc', domain: '.tradera.com', path: '/' }],
      origins: [],
    });
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-123',
      status: 'completed',
      result: {
        outputs: {
          result: {
            externalListingId: 'listing-123',
            listingUrl: 'https://www.tradera.com/item/123',
            publishVerified: true,
          },
        },
      },
    });
  });

  it('forwards saved storageState into the Playwright node runner context', async () => {
    const connection = {
      playwrightPersonaId: 'persona-1',
      playwrightStorageState: 'encrypted-state',
    };

    const result = await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: connection as never,
    });

    expect(parsePersistedStorageStateMock).toHaveBeenCalledWith('encrypted-state');
    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        script: 'export default async function run() {}',
        input: { title: 'Example' },
        personaId: 'persona-1',
        contextOptions: {
          storageState: {
            cookies: [{ name: 'session', value: 'abc', domain: '.tradera.com', path: '/' }],
            origins: [],
          },
        },
      }),
      waitForResult: true,
    });
    expect(result).toMatchObject({
      runId: 'run-123',
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      publishVerified: true,
      effectiveBrowserMode: 'headless',
    });
  });

  it('forwards the Tradera listing form URL as the runner startUrl for storage-state sanitization', async () => {
    const connection = {
      playwrightPersonaId: 'persona-1',
      playwrightStorageState: 'encrypted-state',
    };

    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: {
        title: 'Example',
        traderaConfig: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        },
      },
      connection: connection as never,
    });

    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        startUrl: 'https://www.tradera.com/en/selling/new',
      }),
      waitForResult: true,
    });
  });

  it('overrides the connection headless setting for headed relist troubleshooting runs', async () => {
    const connection = {
      playwrightPersonaId: 'persona-1',
      playwrightStorageState: 'encrypted-state',
    };

    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: connection as never,
      browserMode: 'headed',
    });

    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        settingsOverrides: expect.objectContaining({
          headless: false,
        }),
      }),
      waitForResult: true,
    });
  });

  it('preserves the Playwright run id when the node runner fails', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-failed-1',
      status: 'failed',
      error: 'Script execution failed',
    });

    await expect(
      runPlaywrightListingScript({
        script: 'export default async function run() {}',
        input: { title: 'Example' },
        connection: {} as never,
      })
    ).rejects.toMatchObject({
      message: 'Script execution failed',
      meta: expect.objectContaining({
        runId: 'run-failed-1',
        runStatus: 'failed',
      }),
    });
  });
});
