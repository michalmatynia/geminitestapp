import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import {
  getKangurStorefrontInitialState,
  getKangurSurfaceBootstrapStyle,
} from '@/features/kangur/server';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { escapeForInlineScript } from '../../lib/kangur-surface-bootstrap';

import './kangur.css';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { getKangurThemeSettingsKeyForAppearanceMode } from '@/features/kangur/appearance/theme-settings';
import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  type KangurStorefrontAppearanceMode,
  type KangurStorefrontInitialState,
} from '@/features/kangur/appearance/storefront-appearance-settings';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur-settings-keys';

import type { ReactNode } from 'react';
import type { SettingRecord } from '@/shared/contracts/settings';

const KANGUR_STOREFRONT_APPEARANCE_MODES = [
  'default',
  'dawn',
  'sunset',
  'dark',
] as const satisfies ReadonlyArray<KangurStorefrontAppearanceMode>;

const KANGUR_STOREFRONT_CRITICAL_LITE_SETTINGS = [
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
] as const;

const shouldRefreshKangurSeededLiteStore = (
  liteSettings: ReadonlyArray<SettingRecord>
): boolean => {
  if (liteSettings.length === 0) {
    return true;
  }

  const liteSettingKeys = new Set(liteSettings.map(({ key }) => key));
  return KANGUR_STOREFRONT_CRITICAL_LITE_SETTINGS.some(
    (key) => !liteSettingKeys.has(key)
  );
};

const createKangurAppearanceSettingsEntries = (
  initialState: KangurStorefrontInitialState
): Array<readonly [string, string]> => {
  const entries = new Map<string, string>([
    [KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, initialState.initialMode],
  ]);

  KANGUR_STOREFRONT_APPEARANCE_MODES.forEach((mode) => {
    const value = initialState.initialThemeSettings[mode];
    if (typeof value === 'string' && value.trim().length > 0) {
      entries.set(getKangurThemeSettingsKeyForAppearanceMode(mode), value);
    }
  });

  return Array.from(entries.entries());
};

const createKangurInitialSettingsEntries = ({
  initialState,
  liteSettings,
}: {
  initialState: KangurStorefrontInitialState;
  liteSettings: ReadonlyArray<SettingRecord>;
}): Array<readonly [string, string]> => {
  const entries = new Map<string, string>();
  liteSettings.forEach(({ key, value }) => {
    entries.set(key, value);
  });
  createKangurAppearanceSettingsEntries(initialState).forEach(([key, value]) => {
    entries.set(key, value);
  });
  return Array.from(entries.entries());
};

export default async function KangurAppearanceLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const [liteSettings, initialState] = await Promise.all([
    getLiteSettingsForHydration(),
    getKangurStorefrontInitialState(),
  ]);
  const initialAppearance = {
    mode: initialState.initialMode,
    themeSettings: initialState.initialThemeSettings,
  };
  const surfaceBootstrapStyle = getKangurSurfaceBootstrapStyle(initialAppearance);
  const initialSettingsEntries = createKangurInitialSettingsEntries({
    initialState,
    liteSettings,
  });

  return (
    <>
      <style
        id='__KANGUR_SURFACE_BOOTSTRAP__'
        dangerouslySetInnerHTML={{ __html: escapeForInlineScript(surfaceBootstrapStyle) }}
      />
      <SettingsStoreProvider
        initialEntries={initialSettingsEntries}
        mode='lite'
        refreshSeededLiteStore={shouldRefreshKangurSeededLiteStore(liteSettings)}
      >
        <KangurStorefrontAppearanceProvider initialAppearance={initialAppearance}>
          <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
        </KangurStorefrontAppearanceProvider>
      </SettingsStoreProvider>
    </>
  );
}
