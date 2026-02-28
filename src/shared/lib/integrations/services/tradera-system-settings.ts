import 'server-only';

import {
  resolveTraderaSystemSettings,
  TRADERA_SETTINGS_KEYS,
  type TraderaSystemSettings,
} from '@/shared/lib/integrations/constants/tradera';
import { getSettingValue } from '@/features/products/server';

export const toTruthyBoolean = (value: string | null | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parseSettingsFromMap = (map: Map<string, string>): TraderaSystemSettings =>
  resolveTraderaSystemSettings({
    get: (key: string): string | null => map.get(key) ?? null,
  });

export const loadTraderaSystemSettings = async (): Promise<TraderaSystemSettings> => {
  const keys = Object.values(TRADERA_SETTINGS_KEYS);
  const values = await Promise.all(
    keys.map(async (key: string) => [key, await getSettingValue(key)] as const)
  );
  const map = new Map<string, string>();
  for (const [key, value] of values) {
    if (typeof value === 'string') {
      map.set(key, value);
    }
  }
  return parseSettingsFromMap(map);
};
