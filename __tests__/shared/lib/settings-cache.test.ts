import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLiteSettingsServerCache,
  cloneLiteSettings,
  getLiteSettingsCache,
  getLiteSettingsInflight,
  setLiteSettingsCache,
  setLiteSettingsInflight,
} from '@/shared/lib/settings-lite-server-cache';
import {
  clearSettingsCache,
  getCachedSettings,
  getLastKnownSettings,
  getSettingsCacheStats,
  getSettingsInflight,
  getStaleSettings,
  isSettingsCacheDebugEnabled,
  setCachedSettings,
  setSettingsInflight,
} from '@/shared/lib/settings-cache';
import { resolveAnalyticsRangeWindow } from '@/shared/lib/analytics/range';

describe('settings caches', () => {
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalDebugSettings = process.env['DEBUG_SETTINGS'];

  beforeEach(() => {
    clearSettingsCache();
    clearLiteSettingsServerCache();
    delete process.env['DEBUG_SETTINGS'];
    process.env['NODE_ENV'] = 'test';
  });

  afterEach(() => {
    clearSettingsCache();
    clearLiteSettingsServerCache();
    process.env['NODE_ENV'] = originalNodeEnv;
    if (originalDebugSettings === undefined) {
      delete process.env['DEBUG_SETTINGS'];
    } else {
      process.env['DEBUG_SETTINGS'] = originalDebugSettings;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('tracks cache hits, misses, stale snapshots, and inflight requests', () => {
    const settings = [{ key: 'site_title', value: 'Gemini' }];
    const inflight = Promise.resolve(settings);

    expect(getCachedSettings()).toBeNull();

    setCachedSettings(settings);
    expect(getCachedSettings(null)).toEqual(settings);
    expect(getStaleSettings()).toEqual(settings);
    expect(getLastKnownSettings()).toEqual(settings);

    setSettingsInflight(inflight, 'light');
    expect(getSettingsInflight('light')).toBe(inflight);
    setSettingsInflight(null, 'light');
    expect(getSettingsInflight('light')).toBeNull();

    expect(getSettingsCacheStats()).toEqual(
      expect.objectContaining({
        hits: 1,
        misses: 1,
        inflight: [],
        staleAgeMs: {
          'settings:all': expect.any(Number),
        },
      })
    );
  });

  it('expires stale snapshots after the stale ttl but keeps the last known settings', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const settings = [{ key: 'scope_heavy', value: '1' }];

    nowSpy.mockReturnValue(1_000);
    setCachedSettings(settings, 'heavy');

    nowSpy.mockReturnValue(1_000 + 10 * 60_000 - 1);
    expect(getStaleSettings('heavy')).toEqual(settings);

    nowSpy.mockReturnValue(1_000 + 10 * 60_000 + 1);
    expect(getStaleSettings('heavy')).toBeNull();
    expect(getLastKnownSettings('heavy')).toEqual(settings);
  });

  it('toggles debug mode based on environment and manages the lite server cache', () => {
    process.env['NODE_ENV'] = 'production';
    expect(isSettingsCacheDebugEnabled()).toBe(false);

    process.env['DEBUG_SETTINGS'] = 'true';
    expect(isSettingsCacheDebugEnabled()).toBe(true);

    const settings = [{ key: 'launch_route', value: 'dedicated_app' }];
    const clone = cloneLiteSettings(settings);
    const inflight = Promise.resolve(settings);

    expect(clone).toEqual(settings);
    expect(clone).not.toBe(settings);

    clone[0]!.value = 'mutated';
    expect(settings[0]!.value).toBe('dedicated_app');

    setLiteSettingsCache({ data: settings, ts: 123 });
    setLiteSettingsInflight(inflight);

    expect(getLiteSettingsCache()).toEqual({ data: settings, ts: 123 });
    expect(getLiteSettingsInflight()).toBe(inflight);

    clearLiteSettingsServerCache();
    expect(getLiteSettingsCache()).toBeNull();
    expect(getLiteSettingsInflight()).toBeNull();
  });

  it('resolves analytics windows relative to the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T12:00:00.000Z'));

    const window = resolveAnalyticsRangeWindow('7d');

    expect(window.to.toISOString()).toBe('2026-03-25T12:00:00.000Z');
    expect(window.from.toISOString()).toBe('2026-03-18T12:00:00.000Z');
  });
});
