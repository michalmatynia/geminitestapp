'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/shared/ui';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { fetchSettingValue } from '@/shared/api/settings-client';
import { normalizeThemeSettings, type ThemeSettings } from '@/shared/contracts/cms-theme';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_CATALOG_KEY,
  parseKangurThemeCatalog,
  parseKangurThemeSettings,
  type KangurThemeCatalogEntry,
} from '@/features/kangur/theme-settings';
import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  parseKangurStorefrontAppearanceMode,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';

import {
  AppearanceSlot,
  BUILTIN_DAILY_ID,
  BUILTIN_DAWN_ID,
  BUILTIN_SUNSET_ID,
  BUILTIN_NIGHTLY_ID,
  FACTORY_DAILY_ID,
  FACTORY_DAWN_ID,
  FACTORY_SUNSET_ID,
  FACTORY_NIGHTLY_ID,
  KANGUR_SLOT_ASSIGNMENTS_KEY,
  parseSlotAssignments,
  resolveFactoryTheme,
  SLOT_CONFIG,
  SLOT_ORDER,
  ThemeSelectionId,
} from './AppearancePage.constants';

type AppearancePageContextValue = {
  catalog: KangurThemeCatalogEntry[];
  catalogOverrideRaw: string | null;
  defaultModeDraft: KangurStorefrontAppearanceMode;
  draft: ThemeSettings;
  isDefaultModeSaving: boolean;
  isDirty: boolean;
  isSaving: boolean;
  selectedId: ThemeSelectionId;
  settingsReady: boolean;
  slotAssignments: Record<AppearanceSlot, { id: string; name: string } | null>;
  slotLabelsByKey: Record<AppearanceSlot, string>;
  slotThemes: Record<AppearanceSlot, ThemeSettings>;
  handleDefaultModeChange: (next: KangurStorefrontAppearanceMode) => Promise<void>;
  handleResetToFactory: () => void;
  handleSave: () => Promise<void>;
  handleSelect: (id: ThemeSelectionId) => void;
  setDraft: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  updateCatalog: (nextRaw: string) => void;
};

const AppearancePageContext = createContext<AppearancePageContextValue | null>(null);

export function AppearancePageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const settingsReady = settingsStore.isReady;

  const [catalogOverrideRaw, setCatalogOverrideRaw] = useState<string | null>(null);
  const catalogFreshFetchedRef = useRef(false);

  const catalogRaw = catalogOverrideRaw ?? settingsStore.get(KANGUR_THEME_CATALOG_KEY);
  const catalog = useMemo(() => parseKangurThemeCatalog(catalogRaw), [catalogRaw]);

  useEffect(() => {
    if (!settingsReady || catalogFreshFetchedRef.current) return;
    catalogFreshFetchedRef.current = true;
    void fetchSettingValue({
      key: KANGUR_THEME_CATALOG_KEY,
      bypassCache: true,
      scope: 'light',
    })
      .then((raw) => {
        if (raw && raw !== catalogRaw) {
          setCatalogOverrideRaw(raw);
        }
      })
      .catch(() => {});
  }, [catalogRaw, settingsReady]);

  const slotAssignments = useMemo(
    () => parseSlotAssignments(settingsStore.get(KANGUR_SLOT_ASSIGNMENTS_KEY)),
    [settingsStore.get(KANGUR_SLOT_ASSIGNMENTS_KEY)]
  );

  const slotLabelsByKey = useMemo(() => {
    const getLabel = (slot: AppearanceSlot, key: string) => {
      const raw = settingsStore.get(key);
      if (!raw?.trim() || !slotAssignments[slot]) return 'Fabryczny';
      return slotAssignments[slot]!.name;
    };
    return {
      daily: getLabel('daily', KANGUR_DAILY_THEME_SETTINGS_KEY),
      dawn: getLabel('dawn', KANGUR_DAWN_THEME_SETTINGS_KEY),
      sunset: getLabel('sunset', KANGUR_SUNSET_THEME_SETTINGS_KEY),
      nightly: getLabel('nightly', KANGUR_NIGHTLY_THEME_SETTINGS_KEY),
    };
  }, [slotAssignments, settingsStore]);

  const storedDefaultMode = useMemo(
    () => parseKangurStorefrontAppearanceMode(settingsStore.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY)),
    [settingsStore.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY)]
  );
  const [defaultModeDraft, setDefaultModeDraft] = useState<KangurStorefrontAppearanceMode>(storedDefaultMode);
  const [isDefaultModeSaving, setIsDefaultModeSaving] = useState(false);

  useEffect(() => {
    setDefaultModeDraft(storedDefaultMode);
  }, [storedDefaultMode]);

  const handleDefaultModeChange = useCallback(
    async (next: KangurStorefrontAppearanceMode): Promise<void> => {
      if (next === defaultModeDraft) return;
      setDefaultModeDraft(next);
      setIsDefaultModeSaving(true);
      try {
        await updateSetting.mutateAsync({
          key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
          value: next,
        });
        toast('Domyślny motyw startowy zaktualizowany.', { variant: 'success' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Nie udało się zapisać domyślnego motywu.', { variant: 'error' });
        setDefaultModeDraft(storedDefaultMode);
      } finally {
        setIsDefaultModeSaving(false);
      }
    },
    [defaultModeDraft, storedDefaultMode, toast, updateSetting]
  );

  const [selectedId, setSelectedId] = useState<ThemeSelectionId>(BUILTIN_DAILY_ID);
  
  const loadTheme = useCallback(
    (id: ThemeSelectionId): ThemeSettings => {
      if ([FACTORY_DAILY_ID, FACTORY_DAWN_ID, FACTORY_SUNSET_ID, FACTORY_NIGHTLY_ID].includes(id)) {
        return resolveFactoryTheme(id);
      }
      const slotMap: Record<string, { key: string; default: ThemeSettings }> = {
        [BUILTIN_DAILY_ID]: { key: KANGUR_DAILY_THEME_SETTINGS_KEY, default: SLOT_CONFIG.daily.defaultTheme },
        [BUILTIN_DAWN_ID]: { key: KANGUR_DAWN_THEME_SETTINGS_KEY, default: SLOT_CONFIG.dawn.defaultTheme },
        [BUILTIN_SUNSET_ID]: { key: KANGUR_SUNSET_THEME_SETTINGS_KEY, default: SLOT_CONFIG.sunset.defaultTheme },
        [BUILTIN_NIGHTLY_ID]: { key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY, default: SLOT_CONFIG.nightly.defaultTheme },
      };
      if (slotMap[id]) {
        return parseKangurThemeSettings(settingsStore.get(slotMap[id]!.key), slotMap[id]!.default) ?? slotMap[id]!.default;
      }
      const entry = catalog.find((e) => e.id === id);
      return entry ? normalizeThemeSettings(entry.settings, SLOT_CONFIG.daily.defaultTheme) : SLOT_CONFIG.daily.defaultTheme;
    },
    [catalog, settingsStore]
  );

  const [draft, setDraft] = useState<ThemeSettings>(() => loadTheme(BUILTIN_DAILY_ID));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const slotThemes = useMemo(
    () => ({
      daily: parseKangurThemeSettings(settingsStore.get(KANGUR_DAILY_THEME_SETTINGS_KEY), SLOT_CONFIG.daily.defaultTheme) ?? SLOT_CONFIG.daily.defaultTheme,
      dawn: parseKangurThemeSettings(settingsStore.get(KANGUR_DAWN_THEME_SETTINGS_KEY), SLOT_CONFIG.dawn.defaultTheme) ?? SLOT_CONFIG.dawn.defaultTheme,
      sunset: parseKangurThemeSettings(settingsStore.get(KANGUR_SUNSET_THEME_SETTINGS_KEY), SLOT_CONFIG.sunset.defaultTheme) ?? SLOT_CONFIG.sunset.defaultTheme,
      nightly: parseKangurThemeSettings(settingsStore.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY), SLOT_CONFIG.nightly.defaultTheme) ?? SLOT_CONFIG.nightly.defaultTheme,
    }),
    [settingsStore]
  );

  const handleSelect = useCallback(
    (id: ThemeSelectionId) => {
      if (id === selectedId) return;
      if (isDirty) {
        if (!confirm('Masz niezapisane zmiany w aktualnym motywie. Czy na pewno chcesz przełączyć?')) return;
      }
      setSelectedId(id);
      setDraft(loadTheme(id));
      setIsDirty(false);
    },
    [isDirty, loadTheme, selectedId]
  );

  const handleResetToFactory = useCallback(() => {
    const factoryId =
      selectedId === BUILTIN_DAWN_ID || selectedId === FACTORY_DAWN_ID
        ? FACTORY_DAWN_ID
        : selectedId === BUILTIN_SUNSET_ID || selectedId === FACTORY_SUNSET_ID
          ? FACTORY_SUNSET_ID
          : selectedId === BUILTIN_NIGHTLY_ID || selectedId === FACTORY_NIGHTLY_ID
            ? FACTORY_NIGHTLY_ID
            : FACTORY_DAILY_ID;

    setDraft(resolveFactoryTheme(factoryId));
    setIsDirty(true);
  }, [selectedId]);

  const handleSave = useCallback(async () => {
    const isBuiltin = [BUILTIN_DAILY_ID, BUILTIN_DAWN_ID, BUILTIN_SUNSET_ID, BUILTIN_NIGHTLY_ID].includes(selectedId);
    if (!isBuiltin && !catalog.some((e) => e.id === selectedId)) {
      toast('Nie można zapisać zmian w motywie fabrycznym.', { variant: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      if (isBuiltin) {
        const key =
          selectedId === BUILTIN_DAWN_ID
            ? KANGUR_DAWN_THEME_SETTINGS_KEY
            : selectedId === BUILTIN_SUNSET_ID
              ? KANGUR_SUNSET_THEME_SETTINGS_KEY
              : selectedId === BUILTIN_NIGHTLY_ID
                ? KANGUR_NIGHTLY_THEME_SETTINGS_KEY
                : KANGUR_DAILY_THEME_SETTINGS_KEY;

        await updateSetting.mutateAsync({ key, value: serializeSetting(draft) });
      } else {
        const nextCatalog = catalog.map((entry) => (entry.id === selectedId ? { ...entry, settings: draft } : entry));
        await updateSetting.mutateAsync({ key: KANGUR_THEME_CATALOG_KEY, value: serializeSetting(nextCatalog) });
        setCatalogOverrideRaw(serializeSetting(nextCatalog));
      }
      setIsDirty(false);
      toast('Motyw został zapisany.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Błąd zapisu motywu.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [catalog, draft, selectedId, toast, updateSetting]);

  const updateCatalog = useCallback((nextRaw: string) => {
    setCatalogOverrideRaw(nextRaw);
  }, []);

  const value = useMemo(
    () => ({
      catalog,
      catalogOverrideRaw,
      defaultModeDraft,
      draft,
      isDefaultModeSaving,
      isDirty,
      isSaving,
      selectedId,
      settingsReady,
      slotAssignments,
      slotLabelsByKey,
      slotThemes,
      handleDefaultModeChange,
      handleResetToFactory,
      handleSave,
      handleSelect,
      setDraft,
      updateCatalog,
    }),
    [
      catalog,
      catalogOverrideRaw,
      defaultModeDraft,
      draft,
      isDefaultModeSaving,
      isDirty,
      isSaving,
      selectedId,
      settingsReady,
      slotAssignments,
      slotLabelsByKey,
      slotThemes,
      handleDefaultModeChange,
      handleResetToFactory,
      handleSave,
      handleSelect,
      updateCatalog,
    ]
  );

  return <AppearancePageContext.Provider value={value}>{children}</AppearancePageContext.Provider>;
}

export function useAppearancePage(): AppearancePageContextValue {
  const context = useContext(AppearancePageContext);
  if (!context) {
    throw new Error('useAppearancePage must be used within an AppearancePageProvider');
  }
  return context;
}
