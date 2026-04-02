import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getTraderaCategoriesMock,
  ensureLoggedInMock,
  findVisibleLocatorMock,
  loadTraderaSystemSettingsMock,
  resolveConnectionPlaywrightSettingsMock,
  chromiumLaunchMock,
  pageCloseMock,
  contextCloseMock,
  browserCloseMock,
} = vi.hoisted(() => ({
  getTraderaCategoriesMock: vi.fn(),
  ensureLoggedInMock: vi.fn(),
  findVisibleLocatorMock: vi.fn(),
  loadTraderaSystemSettingsMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  chromiumLaunchMock: vi.fn(),
  pageCloseMock: vi.fn(),
  contextCloseMock: vi.fn(),
  browserCloseMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

vi.mock('@/features/integrations/services/tradera-api-client', () => ({
  getTraderaCategories: (...args: unknown[]) => getTraderaCategoriesMock(...args),
}));

vi.mock('./api', () => ({
  resolveTraderaPublicApiCredentials: () => ({
    appId: 123,
    appKey: 'secret',
    sandbox: false,
  }),
}));

vi.mock('./browser', () => ({
  ensureLoggedIn: (...args: unknown[]) => ensureLoggedInMock(...args),
}));

vi.mock('./utils', () => ({
  findVisibleLocator: (...args: unknown[]) => findVisibleLocatorMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-system-settings', () => ({
  loadTraderaSystemSettings: (...args: unknown[]) => loadTraderaSystemSettingsMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  parsePersistedStorageState: () => null,
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: (...args: unknown[]) => chromiumLaunchMock(...args),
  },
  devices: {},
}));

import { fetchTraderaCategoriesForConnection } from './categories';

describe('fetchTraderaCategoriesForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadTraderaSystemSettingsMock.mockResolvedValue({
      listingFormUrl: 'https://www.tradera.com/en/selling/new',
    });
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      headless: true,
      slowMo: 0,
      timeout: 30_000,
      navigationTimeout: 30_000,
      emulateDevice: false,
      deviceName: null,
      proxyEnabled: false,
      proxyServer: null,
      proxyUsername: null,
      proxyPassword: null,
    });
    pageCloseMock.mockResolvedValue(undefined);
    contextCloseMock.mockResolvedValue(undefined);
    browserCloseMock.mockResolvedValue(undefined);
  });

  it('prefers categories from the official Tradera API when available', async () => {
    getTraderaCategoriesMock.mockResolvedValue([
      { id: '10', name: 'Collectibles', parentId: null },
      { id: '11', name: 'Pins', parentId: '10' },
    ]);

    const result = await fetchTraderaCategoriesForConnection({ id: 'connection-1' } as never);

    expect(result).toEqual([
      { id: '10', name: 'Collectibles', parentId: '0' },
      { id: '11', name: 'Pins', parentId: '10' },
    ]);
    expect(chromiumLaunchMock).not.toHaveBeenCalled();
  });

  it('falls back to the browser selector path when the API fetch fails', async () => {
    getTraderaCategoriesMock.mockRejectedValue(new Error('api failed'));

    const optionEvaluateAllMock = vi.fn().mockResolvedValue([
      { id: '20', name: 'Fallback One' },
      { id: '21', name: 'Fallback Two' },
    ]);
    findVisibleLocatorMock.mockResolvedValue({
      locator: vi.fn().mockReturnValue({
        evaluateAll: optionEvaluateAllMock,
      }),
    });

    chromiumLaunchMock.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        setDefaultTimeout: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          close: pageCloseMock,
        }),
        close: contextCloseMock,
      }),
      close: browserCloseMock,
    });

    const result = await fetchTraderaCategoriesForConnection({
      id: 'connection-1',
      playwrightStorageState: null,
    } as never);

    expect(chromiumLaunchMock).toHaveBeenCalled();
    expect(ensureLoggedInMock).toHaveBeenCalled();
    expect(result).toEqual([
      { id: '20', name: 'Fallback One', parentId: '0' },
      { id: '21', name: 'Fallback Two', parentId: '0' },
    ]);
  });
});
