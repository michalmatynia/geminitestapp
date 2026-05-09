import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const { getSettingValueMock } = vi.hoisted(() => ({
  getSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: (...args: unknown[]) => getSettingValueMock(...args),
}));

import { loadTraderaSystemSettings } from './tradera-system-settings';

describe('loadTraderaSystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettingValueMock.mockResolvedValue(null);
  });

  it('loads the listing price currency setting with an EUR default', async () => {
    const settings = await loadTraderaSystemSettings();

    expect(getSettingValueMock).toHaveBeenCalledWith(
      TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode
    );
    expect(settings.listingPriceCurrencyCode).toBe('EUR');
  });

  it('normalizes saved Tradera listing price currency overrides', async () => {
    getSettingValueMock.mockImplementation((key: string) =>
      Promise.resolve(
        key === TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode ? ' sek ' : null
      )
    );

    await expect(loadTraderaSystemSettings()).resolves.toMatchObject({
      listingPriceCurrencyCode: 'SEK',
    });
  });
});
