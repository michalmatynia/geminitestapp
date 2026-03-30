import 'server-only';

import { prewarmLiteSettingsServerCache } from '@/app/api/settings/lite/handler';
import { cloneLiteSettings, getLiteSettingsCache } from '@/shared/lib/settings-lite-server-cache';

import type { SettingRecord } from '@/shared/contracts/settings';

/**
 * Fetch lite settings on the server and return them for SSR hydration.
 * The result is injected into a <script> tag so the client can skip the
 * /api/settings/lite round-trip on first load.
 */
export async function getLiteSettingsForHydration(): Promise<SettingRecord[]> {
  try {
    await prewarmLiteSettingsServerCache();
    const cache = getLiteSettingsCache();
    return cache ? cloneLiteSettings(cache.data) : [];
  } catch {
    return [];
  }
}
