import 'server-only';

import { prewarmLiteSettingsServerCache } from '@/app/api/settings/lite/handler';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { cloneLiteSettings, getLiteSettingsCache } from '@/shared/lib/settings-lite-server-cache';

import type { SettingRecord } from '@/shared/contracts/settings';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS = parsePositiveInt(
  process.env['LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS'],
  process.env['NODE_ENV'] === 'development' ? 50 : 150
);

const waitForLiteSettingsPrewarm = async (): Promise<void> => {
  const prewarmPromise = prewarmLiteSettingsServerCache();
  void prewarmPromise.catch(() => {});

  if (LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS <= 0) {
    await prewarmPromise;
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      prewarmPromise,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Fetch lite settings on the server and return them for SSR hydration.
 * The result is injected into a <script> tag so the client can skip the
 * /api/settings/lite round-trip on first load.
 */
export async function getLiteSettingsForHydration(): Promise<SettingRecord[]> {
  'use cache';
  applyCacheLife('swr60');

  try {
    await waitForLiteSettingsPrewarm();
    const cache = getLiteSettingsCache();
    return cache ? cloneLiteSettings(cache.data) : [];
  } catch {
    return [];
  }
}
