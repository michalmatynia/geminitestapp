import 'server-only';

import { applyCacheLife } from '@/shared/lib/next/cache-life';

import { readDatabaseEngineLiteSettings } from './handlers';

import type { SettingRecord } from '@/shared/contracts/settings';

export async function getLiteSettingsForHydration(): Promise<SettingRecord[]> {
  'use cache';
  applyCacheLife('swr60');

  try {
    return await readDatabaseEngineLiteSettings();
  } catch {
    return [];
  }
}
