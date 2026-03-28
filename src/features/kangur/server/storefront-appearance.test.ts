/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { getSettingValueMock, listKangurSettingsByKeysMock } = vi.hoisted(() => ({
  getSettingValueMock: vi.fn(),
  listKangurSettingsByKeysMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
  };
});

vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: getSettingValueMock,
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  listKangurSettingsByKeys: listKangurSettingsByKeysMock,
}));

describe('storefront-appearance', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSettingValueMock.mockResolvedValue('default');
    listKangurSettingsByKeysMock.mockResolvedValue([]);
  });

  it('falls back to empty theme settings when transient mongo reads fail', async () => {
    const transientError = new Error(
      'querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net'
    );
    transientError.name = 'MongoServerSelectionError';

    getSettingValueMock.mockResolvedValue('dark');
    listKangurSettingsByKeysMock.mockRejectedValue(transientError);

    const { getKangurStorefrontInitialState } = await import('./storefront-appearance');

    await expect(getKangurStorefrontInitialState()).resolves.toEqual({
      initialMode: 'dark',
      initialThemeSettings: {
        default: null,
        dawn: null,
        sunset: null,
        dark: null,
      },
    });
  });

  it('rethrows unexpected theme-settings failures', async () => {
    const error = new Error('invalid theme settings payload');
    listKangurSettingsByKeysMock.mockRejectedValue(error);

    const { getKangurStorefrontInitialState } = await import('./storefront-appearance');

    await expect(getKangurStorefrontInitialState()).rejects.toThrow(
      'invalid theme settings payload'
    );
  });
});
