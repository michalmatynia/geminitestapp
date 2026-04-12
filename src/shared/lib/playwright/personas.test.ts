import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';

const { fetchSettingsCachedMock } = vi.hoisted(() => ({
  fetchSettingsCachedMock: vi.fn(),
}));

vi.mock('@/shared/api/settings-client', () => ({
  fetchSettingsCached: fetchSettingsCachedMock,
}));

import {
  arePlaywrightSettingsEqual,
  buildPlaywrightSettings,
  createPlaywrightPersonaId,
  fetchPlaywrightPersonas,
  findPlaywrightPersonaMatch,
  normalizePlaywrightPersonas,
} from './personas';
import { defaultPlaywrightSettings } from './settings';

describe('playwright personas shared-lib', () => {
  beforeEach(() => {
    fetchSettingsCachedMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T18:00:00.000Z'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('builds settings from defaults and prefers crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'persona-uuid'),
    });

    expect(createPlaywrightPersonaId()).toBe('persona-uuid');
    expect(
      buildPlaywrightSettings({
        identityProfile: 'marketplace',
        proxyEnabled: true,
        proxyServer: 'http://proxy.local',
        locale: 'en-US',
        slowMo: 10,
      })
    ).toEqual({
      ...defaultPlaywrightSettings,
      identityProfile: 'marketplace',
      proxyEnabled: true,
      proxyServer: 'http://proxy.local',
      locale: 'en-US',
      slowMo: 10,
    });
  });

  it('falls back to a timestamp-based id when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const id = createPlaywrightPersonaId();

    expect(id).toMatch(/^persona-/);
    expect(id.startsWith(`persona-${Date.now().toString(36)}-`)).toBe(true);
  });

  it('normalizes personas and matches settings while tolerating blank proxy passwords', () => {
    expect(normalizePlaywrightPersonas(null)).toEqual([]);

    const personas = normalizePlaywrightPersonas([
      null,
      { name: '   ' },
      {
        createdAt: '2026-03-24T10:00:00.000Z',
        description: 'Catalog crawler',
        name: '  Catalog  ',
        settings: {
          identityProfile: 'search',
          proxyEnabled: true,
          proxyPassword: '',
          proxyServer: 'http://proxy.local',
          proxySessionMode: 'rotate',
          proxyProviderPreset: 'decodo',
          timezoneId: 'Europe/Warsaw',
          slowMo: 125,
        },
      },
    ]);

    expect(personas).toHaveLength(1);
    expect(personas[0]).toEqual(
      expect.objectContaining({
        description: 'Catalog crawler',
        name: 'Catalog',
        createdAt: '2026-03-24T10:00:00.000Z',
        updatedAt: '2026-03-24T10:00:00.000Z',
        settings: expect.objectContaining({
          slowMo: 125,
          identityProfile: 'search',
          proxyEnabled: true,
          proxyServer: 'http://proxy.local',
          proxySessionMode: 'rotate',
          proxyProviderPreset: 'decodo',
          timezoneId: 'Europe/Warsaw',
          timeout: defaultPlaywrightSettings.timeout,
        }),
      })
    );

    const matched = findPlaywrightPersonaMatch(
      buildPlaywrightSettings({
        proxyEnabled: true,
        proxyPassword: 'secret',
        proxyServer: 'http://proxy.local',
        proxySessionMode: 'rotate',
        proxyProviderPreset: 'decodo',
        identityProfile: 'search',
        slowMo: 125,
        timezoneId: 'Europe/Warsaw',
      }),
      personas
    );

    expect(matched).toEqual(personas[0]);
    expect(
      arePlaywrightSettingsEqual(
        buildPlaywrightSettings({ deviceName: 'Desktop Chrome' }),
        buildPlaywrightSettings({ deviceName: 'Pixel 7' })
      )
    ).toBe(false);
    expect(
      arePlaywrightSettingsEqual(
        buildPlaywrightSettings({ locale: 'en-US' }),
        buildPlaywrightSettings({ locale: 'de-DE' })
      )
    ).toBe(false);
    expect(
      arePlaywrightSettingsEqual(
        buildPlaywrightSettings({ identityProfile: 'default' }),
        buildPlaywrightSettings({ identityProfile: 'search' })
      )
    ).toBe(false);
    expect(
      findPlaywrightPersonaMatch(
        buildPlaywrightSettings({ slowMo: 500 }),
        personas
      )
    ).toBeNull();
  });

  it('loads stored personas from cached settings and normalizes their settings', async () => {
    fetchSettingsCachedMock.mockResolvedValue([
      { key: 'unrelated', value: '[]' },
      {
        key: PLAYWRIGHT_PERSONA_SETTINGS_KEY,
        value: JSON.stringify([
          {
            id: 'persona-1',
            name: ' Runner ',
            settings: {
              identityProfile: 'marketplace',
              headless: false,
              locale: 'en-US',
              slowMo: 5,
            },
          },
        ]),
      },
    ]);

    const personas = await fetchPlaywrightPersonas();

    expect(fetchSettingsCachedMock).toHaveBeenCalledTimes(1);
    expect(personas).toEqual([
      expect.objectContaining({
        id: 'persona-1',
        name: 'Runner',
        settings: expect.objectContaining({
          headless: false,
          identityProfile: 'marketplace',
          locale: 'en-US',
          slowMo: 5,
          timeout: defaultPlaywrightSettings.timeout,
        }),
      }),
    ]);
  });
});
