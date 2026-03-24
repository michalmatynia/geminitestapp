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

export function KangurStorefrontAppearanceProvider({
  children,
  initialMode,
  initialThemeSettings,
}: {
  children: ReactNode;
  initialMode?: KangurStorefrontAppearanceMode;
  initialThemeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const [hydrated, setHydrated] = useState(false);
  const storedMode = settingsStore.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY);
  const resolvedMode = useMemo(
    () => parseKangurStorefrontAppearanceMode(storedMode),
    [storedMode]
  );
  const resolvedInitialThemeSettings = useMemo<KangurStorefrontThemeSettingsSnapshot>(
    () => ({
      default: initialThemeSettings?.default ?? null,
      dawn: initialThemeSettings?.dawn ?? null,
      sunset: initialThemeSettings?.sunset ?? null,
      dark: initialThemeSettings?.dark ?? null,
    }),
    [initialThemeSettings]
  );
  const defaultMode = hydrated ? resolvedMode : (initialMode ?? 'default');
  const shouldPersistMode = useMemo(() => {
    const raw = process.env['NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST'];
    if (process.env['NODE_ENV'] !== 'production') {
      return raw !== 'false';
    }
    return raw === 'true';
  }, []);

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
