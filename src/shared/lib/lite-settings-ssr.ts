import 'server-only';

/**
 * Lite Settings Server-Side Rendering
 *
 * Optimized settings loading for SSR with minimal performance impact.
 * Features:
 * - Prewarming of critical settings during build/startup
 * - Timeout-based loading to prevent SSR delays
 * - Cached settings with automatic invalidation
 * - Development vs production timeout optimization
 */

import { cache } from 'react';
import { cloneLiteSettings, getLiteSettingsCache, getLiteSettingsInflight } from '@/shared/lib/settings-lite-server-cache';

import type { SettingRecord } from '@/shared/contracts/settings';

// Parse positive integer with fallback for configuration
const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

// Timeout for settings prewarming (shorter in development for faster rebuilds)
const LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS = parsePositiveInt(
  process.env['LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS'],
  process.env['NODE_ENV'] === 'development' ? 50 : 150
);
const LITE_SETTINGS_SSR_MAX_RECORD_VALUE_CHARS = parsePositiveInt(
  process.env['LITE_SETTINGS_SSR_MAX_RECORD_VALUE_CHARS'],
  128_000
);
const LITE_SETTINGS_SSR_MAX_PAYLOAD_CHARS = parsePositiveInt(
  process.env['LITE_SETTINGS_SSR_MAX_PAYLOAD_CHARS'],
  512_000
);

export const filterLiteSettingsForHydrationPayload = (
  rows: SettingRecord[]
): SettingRecord[] => {
  let payloadChars = 0;
  const filtered: SettingRecord[] = [];

  for (const row of rows) {
    const valueChars = row.value.length;
    if (valueChars > LITE_SETTINGS_SSR_MAX_RECORD_VALUE_CHARS) {
      continue;
    }

    const rowChars = row.key.length + valueChars;
    if (payloadChars + rowChars > LITE_SETTINGS_SSR_MAX_PAYLOAD_CHARS) {
      continue;
    }

    filtered.push(row);
    payloadChars += rowChars;
  }

  return filtered;
};

/**
 * Waits for settings prewarming with timeout to prevent SSR blocking.
 *
 * Only waits for an in-flight prewarm started externally (e.g. instrumentation.ts
 * during server startup, outside any request context). Never starts a new MongoDB
 * fetch here — doing so would create I/O inside the React render context and
 * trigger Next.js dynamicIO errors ("Uncached data accessed outside <Suspense>").
 */
const waitForLiteSettingsPrewarm = async (): Promise<void> => {
  const existingInflight = getLiteSettingsInflight();
  if (!existingInflight) return;

  existingInflight.catch(() => undefined);

  if (LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS <= 0) {
    await existingInflight;
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      existingInflight,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, LITE_SETTINGS_SSR_PREWARM_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Fetch lite settings on the server and return them for SSR hydration.
 * The result is injected into a JSON data island so the client can skip the
 * /api/settings/lite round-trip on first load.
 *
 * Wrapped with React cache() so Next.js dynamicIO treats the MongoDB access
 * as request-scoped cached data, allowing it to be called outside <Suspense>.
 */
export const getLiteSettingsForHydration = cache(async (): Promise<SettingRecord[]> => {
  try {
    const currentCache = getLiteSettingsCache();
    if (currentCache) {
      return filterLiteSettingsForHydrationPayload(cloneLiteSettings(currentCache.data));
    }

    await waitForLiteSettingsPrewarm();
    const warmedCache = getLiteSettingsCache();
    return warmedCache ? filterLiteSettingsForHydrationPayload(cloneLiteSettings(warmedCache.data)) : [];
  } catch {
    return [];
  }
});
