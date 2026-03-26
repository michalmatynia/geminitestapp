import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { readKangurSettingValueMock } = vi.hoisted(() => ({
  readKangurSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  readKangurSettingValue: readKangurSettingValueMock,
}));

describe('kangur server launch route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('defaults to the public web route when no launch setting is stored', async () => {
    readKangurSettingValueMock.mockResolvedValue(null);

    const { getKangurConfiguredLaunchTarget } = await import('./launch-route');

    await expect(
      getKangurConfiguredLaunchTarget(['lessons'], { focus: 'division' })
    ).resolves.toEqual({
      route: 'web_mobile_view',
      href: '/lessons?focus=division',
      fallbackHref: '/lessons?focus=division',
    });
  });

  it('uses the dedicated app deep link when the setting selects the native route', async () => {
    readKangurSettingValueMock.mockResolvedValue(JSON.stringify({ route: 'dedicated_app' }));

    const { getKangurConfiguredLaunchTarget } = await import('./launch-route');

    await expect(
      getKangurConfiguredLaunchTarget(['duels'], { join: 'invite-1' })
    ).resolves.toEqual({
      route: 'dedicated_app',
      href: 'kangur://duels?join=invite-1',
      fallbackHref: '/duels?join=invite-1',
    });
  });

  it('localizes fallback web routes without altering dedicated app deep links', async () => {
    const localizeFallbackHref = vi.fn((href: string) => `/pl${href}`);
    const { getKangurConfiguredLaunchHref } = await import('./launch-route');

    readKangurSettingValueMock.mockResolvedValue(JSON.stringify({ route: 'web_mobile_view' }));
    await expect(
      getKangurConfiguredLaunchHref(['lessons'], { focus: 'division' }, { localizeFallbackHref })
    ).resolves.toBe('/pl/lessons?focus=division');
    expect(localizeFallbackHref).toHaveBeenCalledWith('/lessons?focus=division');

    localizeFallbackHref.mockClear();
    readKangurSettingValueMock.mockResolvedValue(JSON.stringify({ route: 'dedicated_app' }));
    await expect(
      getKangurConfiguredLaunchHref(['duels'], { join: 'invite-1' }, { localizeFallbackHref })
    ).resolves.toBe('kangur://duels?join=invite-1');
    expect(localizeFallbackHref).not.toHaveBeenCalled();
  });

  it('reuses the cached launch route between hot reads and refreshes it after the ttl', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-26T09:00:00.000Z'));
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
      };
    });

    readKangurSettingValueMock.mockResolvedValue(JSON.stringify({ route: 'dedicated_app' }));

    const { getKangurConfiguredLaunchRoute } = await import('./launch-route');

    await expect(getKangurConfiguredLaunchRoute()).resolves.toBe('dedicated_app');
    await expect(getKangurConfiguredLaunchRoute()).resolves.toBe('dedicated_app');
    expect(readKangurSettingValueMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-03-26T09:00:31.000Z'));

    await expect(getKangurConfiguredLaunchRoute()).resolves.toBe('dedicated_app');
    expect(readKangurSettingValueMock).toHaveBeenCalledTimes(2);
  });
});
