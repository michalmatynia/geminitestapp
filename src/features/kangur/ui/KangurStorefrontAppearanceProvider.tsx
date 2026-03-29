'use client';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/public';
import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
  parseKangurStorefrontAppearanceMode,
  type KangurStorefrontThemeSettingsSnapshot,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const KANGUR_EMPTY_THEME_SETTINGS_SNAPSHOT: KangurStorefrontThemeSettingsSnapshot = {
  default: null,
  dawn: null,
  sunset: null,
  dark: null,
};

const KangurStorefrontInitialThemeSettingsContext =
  createContext<KangurStorefrontThemeSettingsSnapshot>(KANGUR_EMPTY_THEME_SETTINGS_SNAPSHOT);
const KangurStorefrontAppearanceHydratedContext = createContext(false);

export const useKangurStorefrontInitialThemeSettings =
  (): KangurStorefrontThemeSettingsSnapshot =>
    useContext(KangurStorefrontInitialThemeSettingsContext);

export const useKangurStorefrontAppearanceHydrated = (): boolean =>
  useContext(KangurStorefrontAppearanceHydratedContext);

const resolveKangurStorefrontInitialThemeSettings = (
  initialThemeSettings:
    | Partial<KangurStorefrontThemeSettingsSnapshot>
    | null
    | undefined
): KangurStorefrontThemeSettingsSnapshot => {
  const settings =
    initialThemeSettings ?? KANGUR_EMPTY_THEME_SETTINGS_SNAPSHOT;

  return {
    default: settings.default ?? null,
    dawn: settings.dawn ?? null,
    sunset: settings.sunset ?? null,
    dark: settings.dark ?? null,
  };
};

const resolveKangurStorefrontPersistMode = (): boolean => {
  const raw = process.env['NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST'];
  return raw !== 'false';
};

export function KangurStorefrontAppearanceProvider({
  children,
  initialAppearance,
  initialMode,
  initialThemeSettings,
}: {
  children: ReactNode;
  initialAppearance?: {
    mode?: KangurStorefrontAppearanceMode;
    themeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
  };
  initialMode?: KangurStorefrontAppearanceMode;
  initialThemeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const [hydrated, setHydrated] = useState(false);
  const resolvedInitialMode = initialAppearance?.mode ?? initialMode;
  const resolvedInitialThemeSettingsInput =
    initialAppearance?.themeSettings ?? initialThemeSettings;
  const storedMode = settingsStore.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY);
  const resolvedMode = useMemo(
    () => parseKangurStorefrontAppearanceMode(storedMode),
    [storedMode]
  );
  const resolvedInitialThemeSettings = useMemo<KangurStorefrontThemeSettingsSnapshot>(
    () => resolveKangurStorefrontInitialThemeSettings(resolvedInitialThemeSettingsInput),
    [resolvedInitialThemeSettingsInput]
  );
  const defaultMode = hydrated ? resolvedMode : (resolvedInitialMode ?? 'default');
  const shouldPersistMode = useMemo(() => resolveKangurStorefrontPersistMode(), []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <KangurStorefrontInitialThemeSettingsContext.Provider value={resolvedInitialThemeSettings}>
      <KangurStorefrontAppearanceHydratedContext.Provider value={hydrated}>
        <CmsStorefrontAppearanceProvider
          initialMode={defaultMode}
          storageKey={KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY}
          persistMode={shouldPersistMode}
        >
          {children}
        </CmsStorefrontAppearanceProvider>
      </KangurStorefrontAppearanceHydratedContext.Provider>
    </KangurStorefrontInitialThemeSettingsContext.Provider>
  );
}
