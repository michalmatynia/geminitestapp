import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const { readIntegrationSettingValueMock } = vi.hoisted(() => ({
  readIntegrationSettingValueMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/integration-settings-store', () => ({
  readIntegrationSettingValue: (...args: unknown[]) =>
    readIntegrationSettingValueMock(...args),
}));

import { loadTraderaSystemSettings } from './tradera-system-settings';

describe('loadTraderaSystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readIntegrationSettingValueMock.mockResolvedValue(null);
  });

  it('loads the listing price currency setting with an EUR default', async () => {
    const settings = await loadTraderaSystemSettings();

    expect(readIntegrationSettingValueMock).toHaveBeenCalledWith(
      TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode
    );
    expect(settings.listingPriceCurrencyCode).toBe('EUR');
  });

  it('normalizes saved Tradera listing price currency overrides', async () => {
    readIntegrationSettingValueMock.mockImplementation((key: string) =>
      Promise.resolve(
        key === TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode ? ' sek ' : null
      )
    );

    await expect(loadTraderaSystemSettings()).resolves.toMatchObject({
      listingPriceCurrencyCode: 'SEK',
    });
  });
});
