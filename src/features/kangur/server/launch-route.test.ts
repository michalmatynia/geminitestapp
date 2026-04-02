import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { readKangurSettingValueMock } = vi.hoisted(() => ({
  readKangurSettingValueMock: vi.fn(),
}));
const { getLiteSettingsForHydrationMock } = vi.hoisted(() => ({
  getLiteSettingsForHydrationMock: vi.fn(),
}));
const { readKangurLaunchRouteDevSnapshotMock } = vi.hoisted(() => ({
  readKangurLaunchRouteDevSnapshotMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  readKangurSettingValue: readKangurSettingValueMock,
}));

vi.mock('@/shared/lib/lite-settings-ssr', () => ({
  getLiteSettingsForHydration: getLiteSettingsForHydrationMock,
}));

vi.mock('@/features/kangur/server/launch-route-dev-snapshot', () => ({
  readKangurLaunchRouteDevSnapshot: readKangurLaunchRouteDevSnapshotMock,
}));

describe('kangur server launch route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getLiteSettingsForHydrationMock.mockResolvedValue([]);
    readKangurLaunchRouteDevSnapshotMock.mockResolvedValue(null);
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-26T09:00:00.000Z'));
    const localizeFallbackHref = vi.fn((href: string) => `/pl${href}`);
    const { getKangurConfiguredLaunchHref } = await import('./launch-route');

    readKangurSettingValueMock.mockResolvedValue(JSON.stringify({ route: 'web_mobile_view' }));
    await expect(
      getKangurConfiguredLaunchHref(['lessons'], { focus: 'division' }, { localizeFallbackHref })
    ).resolves.toBe('/pl/lessons?focus=division');
    expect(localizeFallbackHref).toHaveBeenCalledWith('/lessons?focus=division');

    localizeFallbackHref.mockClear();
    vi.setSystemTime(new Date('2026-03-26T09:00:31.000Z'));
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

  it('reuses the bootstrapped lite launch route without touching the settings repository', async () => {
    getLiteSettingsForHydrationMock.mockResolvedValue([
      {
        key: 'kangur_launch_route_settings_v1',
        value: JSON.stringify({ route: 'dedicated_app' }),
      },
    ]);

    const { getKangurConfiguredLaunchRoute } = await import('./launch-route');

    await expect(getKangurConfiguredLaunchRoute()).resolves.toBe('dedicated_app');
    expect(readKangurSettingValueMock).not.toHaveBeenCalled();
  });

  it('reuses the development snapshot immediately on cold start before touching lite or the settings repository', async () => {
    process.env['NODE_ENV'] = 'development';
    readKangurLaunchRouteDevSnapshotMock.mockResolvedValue('dedicated_app');

    const { getKangurConfiguredLaunchRoute } = await import('./launch-route');

    await expect(getKangurConfiguredLaunchRoute()).resolves.toBe('dedicated_app');
    expect(getLiteSettingsForHydrationMock).not.toHaveBeenCalled();
    expect(readKangurSettingValueMock).not.toHaveBeenCalled();
  });

  it('keeps the cached launch route on the fast path in development after the ttl', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-26T09:00:00.000Z'));
    process.env['NODE_ENV'] = 'development';
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
    expect(readKangurSettingValueMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-03-26T09:00:31.000Z'));

    await expect(getKangurConfiguredLaunchRoute()).resolves.toBe('dedicated_app');
    expect(readKangurSettingValueMock).toHaveBeenCalledTimes(1);
  });
});
