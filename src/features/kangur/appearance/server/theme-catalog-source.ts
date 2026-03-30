import 'server-only';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { KANGUR_THEME_CATALOG_KEY } from '@/shared/contracts/kangur-settings-keys';
import type { SettingRecord } from '@/shared/contracts/settings';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  listKangurSettingsByKeys,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';
import type { KangurThemeCatalogEntry } from '@/features/kangur/appearance/theme-settings';
import {
  KANGUR_DAILY_BLOOM_THEME,
  KANGUR_DAILY_CRYSTAL_THEME,
  KANGUR_LOGO_GLOW_THEME,
  KANGUR_NIGHTLY_AURORA_THEME,
  KANGUR_NIGHTLY_NOCTURNE_THEME,
  KANGUR_SUNSET_HORIZON_THEME,
} from '@/features/kangur/appearance/theme-settings';

type KangurThemeCatalogSeedDefinition = {
  id: string;
  name: string;
  settings: ThemeSettings;
};

const KANGUR_THEME_CATALOG_SEED_TIMESTAMP = '2026-03-30T00:00:00.000Z';

const KANGUR_THEME_CATALOG_SEED_DEFINITIONS: readonly KangurThemeCatalogSeedDefinition[] = [
  {
    id: 'kangur-daily-bloom',
    name: 'Daily Bloom',
    settings: KANGUR_DAILY_BLOOM_THEME,
  },
  {
    id: 'kangur-daily-crystal',
    name: 'Daily Crystal',
    settings: KANGUR_DAILY_CRYSTAL_THEME,
  },
  {
    id: 'kangur-logo-glow',
    name: 'Logo Glow',
    settings: KANGUR_LOGO_GLOW_THEME,
  },
  {
    id: 'kangur-nightly-aurora',
    name: 'Nightly Aurora',
    settings: KANGUR_NIGHTLY_AURORA_THEME,
  },
  {
    id: 'kangur-nightly-nocturne',
    name: 'Nightly Nocturne',
    settings: KANGUR_NIGHTLY_NOCTURNE_THEME,
  },
  {
    id: 'kangur-sunset-horizon',
    name: 'Sunset Horizon',
    settings: KANGUR_SUNSET_HORIZON_THEME,
  },
] as const;

export const createKangurThemeCatalogSeedEntries = ({
  createdAt = KANGUR_THEME_CATALOG_SEED_TIMESTAMP,
  updatedAt = createdAt,
}: {
  createdAt?: string;
  updatedAt?: string;
} = {}): KangurThemeCatalogEntry[] =>
  KANGUR_THEME_CATALOG_SEED_DEFINITIONS.map((entry) => ({
    ...entry,
    createdAt,
    updatedAt,
  }));

export const createKangurThemeCatalogSeedValue = (): string =>
  serializeSetting(createKangurThemeCatalogSeedEntries());

export const createKangurThemeCatalogSeedSetting = (): SettingRecord => ({
  key: KANGUR_THEME_CATALOG_KEY,
  value: createKangurThemeCatalogSeedValue(),
});

export const ensureKangurThemeCatalogSeeded = async (): Promise<SettingRecord> => {
  const [setting] = await listKangurSettingsByKeys([KANGUR_THEME_CATALOG_KEY]);

  if (setting?.value?.trim()) {
    return setting;
  }

  const seedValue = createKangurThemeCatalogSeedValue();
  if (process.env['MONGODB_URI']) {
    await upsertKangurSettingValue(KANGUR_THEME_CATALOG_KEY, seedValue);
  }

  return {
    key: KANGUR_THEME_CATALOG_KEY,
    value: seedValue,
  };
};
