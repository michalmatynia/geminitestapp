import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const getMongoDbMock = vi.hoisted(() => vi.fn());
const isDomainZoningEnabledMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');

  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  };
});
vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));
vi.mock('./cms-domain', () => ({
  isDomainZoningEnabled: isDomainZoningEnabledMock,
}));

describe('getCmsMenuSettings', () => {
  const originalMongoUri = process.env['MONGODB_URI'];
  const findMock = vi.fn();
  const collectionMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    isDomainZoningEnabledMock.mockResolvedValue(true);
    findMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    collectionMock.mockReturnValue({
      find: findMock,
    });
    getMongoDbMock.mockResolvedValue({
      collection: collectionMock,
    });
  });

  afterAll(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
      return;
    }

    process.env['MONGODB_URI'] = originalMongoUri;
  });

  it('selects the highest-priority fallback key from one batched query', async () => {
    findMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          key: 'cms_menu_settings.v1',
          value: JSON.stringify({ showMenu: false, layoutStyle: 'vertical' }),
        },
        {
          key: 'cms_menu_settings.v2.zone.domain-1.locale.de',
          value: JSON.stringify({ showMenu: true, layoutStyle: 'stacked' }),
        },
      ]),
    });

    const { getCmsMenuSettings } = await import('./cms-menu-settings');
    const result = await getCmsMenuSettings('domain-1', 'de');

    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(result.showMenu).toBe(true);
    expect(result.layoutStyle).toBe('stacked');
  });

  it('falls back to defaults when no menu settings are stored', async () => {
    const { DEFAULT_MENU_SETTINGS } = await import('@/shared/contracts/cms-menu');
    const { getCmsMenuSettings } = await import('./cms-menu-settings');

    await expect(getCmsMenuSettings('domain-1', 'de')).resolves.toEqual(DEFAULT_MENU_SETTINGS);
    expect(findMock).toHaveBeenCalledTimes(1);
  });
});
