'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useToast } from '@/features/kangur/shared/ui';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { fetchSettingValue } from '@/shared/api/settings-client';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_CATALOG_KEY,
  parseKangurThemeCatalog,
  parseKangurThemeSettings,
  normalizeKangurThemeSettings,
  type KangurThemeCatalogEntry,
} from '@/features/kangur/appearance/theme-settings';
import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  parseKangurStorefrontAppearanceMode,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/appearance/storefront-appearance-settings';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

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
  PRESET_DAILY_CRYSTAL_ID,
  PRESET_NIGHTLY_CRYSTAL_ID,
  KANGUR_SLOT_ASSIGNMENTS_KEY,
  parseSlotAssignments,
  resolveFactoryTheme,
  SLOT_CONFIG,
  ThemeSelectionId,
} from './AppearancePage.constants';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  getAppearanceContextCopy,
  getAppearanceSlotLabel,
  getAppearanceThemeSelectionLabel,
  resolveAppearanceAdminLocale,
} from './appearance.copy';


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
  handleAssignToSlot: (slot: AppearanceSlot) => Promise<void>;
  handleDefaultModeChange: (next: KangurStorefrontAppearanceMode) => Promise<void>;
  handleResetToFactory: () => void;
  handleSave: () => Promise<void>;
  handleSelect: (id: ThemeSelectionId) => void;
  handleUnassignFromSlot: (slot: AppearanceSlot) => Promise<void>;
  setDraft: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  updateCatalog: (nextRaw: string) => void;
};

type AppearancePageActionsContextValue = Pick<
  AppearancePageContextValue,
  | 'handleAssignToSlot'
  | 'handleDefaultModeChange'
  | 'handleResetToFactory'
  | 'handleSave'
  | 'handleSelect'
  | 'handleUnassignFromSlot'
  | 'setDraft'
  | 'updateCatalog'
>;

type AppearancePageStateContextValue = Omit<
  AppearancePageContextValue,
  keyof AppearancePageActionsContextValue
>;

const AppearancePageContext = createContext<AppearancePageContextValue | null>(null);
const AppearancePageStateContext = createContext<AppearancePageStateContextValue | null>(null);
const AppearancePageActionsContext = createContext<AppearancePageActionsContextValue | null>(null);

export function AppearancePageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const locale = resolveAppearanceAdminLocale(useLocale());
  const contextCopy = getAppearanceContextCopy(locale);
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const settingsReady =
    !settingsStore.isLoading && !settingsStore.isFetching && !settingsStore.error;

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
      .catch((error) => {
        void ErrorSystem.captureException(error);
      });
  }, [catalogRaw, settingsReady]);

  const slotAssignments = useMemo(
    () => parseSlotAssignments(settingsStore.get(KANGUR_SLOT_ASSIGNMENTS_KEY)),
    [settingsStore.get(KANGUR_SLOT_ASSIGNMENTS_KEY)]
  );

  const SLOT_FACTORY_LABELS: Record<AppearanceSlot, string> = {
    daily: getAppearanceThemeSelectionLabel(locale, FACTORY_DAILY_ID, []),
    dawn: getAppearanceThemeSelectionLabel(locale, FACTORY_DAWN_ID, []),
    sunset: getAppearanceThemeSelectionLabel(locale, FACTORY_SUNSET_ID, []),
    nightly: getAppearanceThemeSelectionLabel(locale, FACTORY_NIGHTLY_ID, []),
  };

  const slotLabelsByKey = useMemo(() => {
    const getLabel = (slot: AppearanceSlot, key: string) => {
      const raw = settingsStore.get(key);
      const assignment = slotAssignments[slot];
      if (!raw?.trim() || !assignment) return SLOT_FACTORY_LABELS[slot];
      const localizedName = getAppearanceThemeSelectionLabel(locale, assignment.id, catalog);
      return localizedName !== String(assignment.id) ? localizedName : assignment.name;
    };
    return {
      daily: getLabel('daily', KANGUR_DAILY_THEME_SETTINGS_KEY),
      dawn: getLabel('dawn', KANGUR_DAWN_THEME_SETTINGS_KEY),
      sunset: getLabel('sunset', KANGUR_SUNSET_THEME_SETTINGS_KEY),
      nightly: getLabel('nightly', KANGUR_NIGHTLY_THEME_SETTINGS_KEY),
    };
  }, [catalog, locale, slotAssignments, settingsStore]);

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
      const didSave = await withKangurClientError(
        {
          source: 'kangur.admin.appearance',
          action: 'update-default-mode',
          description: 'Updates the default storefront appearance mode.',
          context: { mode: next },
        },
        async () => {
          await updateSetting.mutateAsync({
            key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
            value: next,
          });
          return true;
        },
        {
          fallback: false,
          onError: (error) => {
            toast(
              error instanceof Error
                ? error.message
                : contextCopy.defaultModeSaveError,
              { variant: 'error' }
            );
            setDefaultModeDraft(storedDefaultMode);
          },
        }
      );

      if (didSave) {
        toast(contextCopy.defaultModeSaveSuccess, { variant: 'success' });
      }
      setIsDefaultModeSaving(false);
    },
    [
      contextCopy.defaultModeSaveError,
      contextCopy.defaultModeSaveSuccess,
      defaultModeDraft,
      locale,
      storedDefaultMode,
      toast,
      updateSetting,
    ]
  );

  const [selectedId, setSelectedId] = useState<ThemeSelectionId>(BUILTIN_DAILY_ID);
  
  const loadTheme = useCallback(
    (id: ThemeSelectionId): ThemeSettings => {
      if ([FACTORY_DAILY_ID, FACTORY_DAWN_ID, FACTORY_SUNSET_ID, FACTORY_NIGHTLY_ID, PRESET_DAILY_CRYSTAL_ID, PRESET_NIGHTLY_CRYSTAL_ID].includes(id)) {
        return resolveFactoryTheme(id);
      }
      const slotMap: Record<string, { key: string; default: ThemeSettings }> = {
        [BUILTIN_DAILY_ID]: {
          key: KANGUR_DAILY_THEME_SETTINGS_KEY,
          default: SLOT_CONFIG.daily.defaultTheme,
        },
        [BUILTIN_DAWN_ID]: {
          key: KANGUR_DAWN_THEME_SETTINGS_KEY,
          default: SLOT_CONFIG.dawn.defaultTheme,
        },
        [BUILTIN_SUNSET_ID]: {
          key: KANGUR_SUNSET_THEME_SETTINGS_KEY,
          default: SLOT_CONFIG.sunset.defaultTheme,
        },
        [BUILTIN_NIGHTLY_ID]: {
          key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
          default: SLOT_CONFIG.nightly.defaultTheme,
        },
      };
      const slotEntry = slotMap[id];
      if (slotEntry) {
        return (
          parseKangurThemeSettings(settingsStore.get(slotEntry.key), slotEntry.default) ??
          slotEntry.default
        );
      }
      const entry = catalog.find((e) => e.id === id);
      return entry
        ? normalizeKangurThemeSettings(entry.settings, SLOT_CONFIG.daily.defaultTheme)
        : SLOT_CONFIG.daily.defaultTheme;
    },
    [catalog, settingsStore]
  );

  const [draft, setDraftState] = useState<ThemeSettings>(() => loadTheme(BUILTIN_DAILY_ID));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const setDraft = useCallback(
    (next: React.SetStateAction<ThemeSettings>) => {
      setDraftState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        if (resolved !== prev) {
          setIsDirty(true);
        }
        return resolved;
      });
    },
    []
  );

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
        if (!confirm(contextCopy.unsavedSwitchConfirm)) return;
      }
      setSelectedId(id);
      setDraftState(loadTheme(id));
      setIsDirty(false);
    },
    [contextCopy.unsavedSwitchConfirm, isDirty, loadTheme, selectedId]
  );

  const handleResetToFactory = useCallback(() => {
    const factoryId =
      selectedId === PRESET_DAILY_CRYSTAL_ID
        ? PRESET_DAILY_CRYSTAL_ID
        : selectedId === PRESET_NIGHTLY_CRYSTAL_ID
          ? PRESET_NIGHTLY_CRYSTAL_ID
          : selectedId === BUILTIN_DAWN_ID || selectedId === FACTORY_DAWN_ID
            ? FACTORY_DAWN_ID
            : selectedId === BUILTIN_SUNSET_ID || selectedId === FACTORY_SUNSET_ID
              ? FACTORY_SUNSET_ID
              : selectedId === BUILTIN_NIGHTLY_ID || selectedId === FACTORY_NIGHTLY_ID
                ? FACTORY_NIGHTLY_ID
                : FACTORY_DAILY_ID;

    setDraftState(resolveFactoryTheme(factoryId));
    setIsDirty(true);
  }, [selectedId]);

  const resolveThemeName = useCallback(
    (id: ThemeSelectionId): string => {
      return getAppearanceThemeSelectionLabel(locale, id, catalog);
    },
    [catalog, locale]
  );

  const slotSettingsKey = (slot: AppearanceSlot): string =>
    slot === 'dawn' ? KANGUR_DAWN_THEME_SETTINGS_KEY
    : slot === 'sunset' ? KANGUR_SUNSET_THEME_SETTINGS_KEY
    : slot === 'nightly' ? KANGUR_NIGHTLY_THEME_SETTINGS_KEY
    : KANGUR_DAILY_THEME_SETTINGS_KEY;

  const handleAssignToSlot = useCallback(
    async (slot: AppearanceSlot): Promise<void> => {
      const didAssign = await withKangurClientError(
        {
          source: 'kangur.admin.appearance',
          action: 'assign-theme-slot',
          description: 'Assigns the selected theme to a storefront slot.',
          context: { slot, selectionId: selectedId },
        },
        async () => {
          await updateSetting.mutateAsync({
            key: slotSettingsKey(slot),
            value: serializeSetting(draft),
          });
          const nextAssignments = {
            ...slotAssignments,
            [slot]: { id: selectedId, name: resolveThemeName(selectedId) },
          };
          await updateSetting.mutateAsync({
            key: KANGUR_SLOT_ASSIGNMENTS_KEY,
            value: serializeSetting(nextAssignments),
          });
          return true;
        },
        {
          fallback: false,
          onError: (error) => {
            toast(
              error instanceof Error ? error.message : contextCopy.assignError,
              { variant: 'error' }
            );
          },
        }
      );

      if (didAssign) {
        toast(contextCopy.assignSuccess(getAppearanceSlotLabel(locale, slot)), {
          variant: 'success',
        });
      }
    },
    [
      contextCopy.assignError,
      contextCopy.assignSuccess,
      draft,
      locale,
      resolveThemeName,
      selectedId,
      slotAssignments,
      toast,
      updateSetting,
    ]
  );

  const handleUnassignFromSlot = useCallback(
    async (slot: AppearanceSlot): Promise<void> => {
      const didUnassign = await withKangurClientError(
        {
          source: 'kangur.admin.appearance',
          action: 'unassign-theme-slot',
          description: 'Unassigns a theme from the storefront slot.',
          context: { slot },
        },
        async () => {
          await updateSetting.mutateAsync({ key: slotSettingsKey(slot), value: '' });
          const nextAssignments = { ...slotAssignments, [slot]: null };
          await updateSetting.mutateAsync({
            key: KANGUR_SLOT_ASSIGNMENTS_KEY,
            value: serializeSetting(nextAssignments),
          });
          return true;
        },
        {
          fallback: false,
          onError: (error) => {
            toast(
              error instanceof Error ? error.message : contextCopy.unassignError,
              { variant: 'error' }
            );
          },
        }
      );

      if (didUnassign) {
        toast(contextCopy.unassignSuccess(getAppearanceSlotLabel(locale, slot)), {
          variant: 'success',
        });
      }
    },
    [
      contextCopy.unassignError,
      contextCopy.unassignSuccess,
      locale,
      slotAssignments,
      toast,
      updateSetting,
    ]
  );

  const handleSave = useCallback(async () => {
    const isBuiltin = [BUILTIN_DAILY_ID, BUILTIN_DAWN_ID, BUILTIN_SUNSET_ID, BUILTIN_NIGHTLY_ID].includes(selectedId);
    if (!isBuiltin && !catalog.some((e) => e.id === selectedId)) {
      toast(contextCopy.saveFactoryError, { variant: 'error' });
      return;
    }

    setIsSaving(true);
    const didSave = await withKangurClientError(
      {
        source: 'kangur.admin.appearance',
        action: 'save-theme',
        description: 'Saves the current theme draft to settings or catalog.',
        context: { selectionId: selectedId, isBuiltin },
      },
      async () => {
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
          const nextCatalog = catalog.map((entry) =>
            entry.id === selectedId ? { ...entry, settings: draft } : entry
          );
          const serialized = serializeSetting(nextCatalog);
          await updateSetting.mutateAsync({ key: KANGUR_THEME_CATALOG_KEY, value: serialized });
          setCatalogOverrideRaw(serialized);
        }
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(error instanceof Error ? error.message : contextCopy.saveError, {
            variant: 'error',
          });
        },
      }
    );

    if (didSave) {
      setIsDirty(false);
      toast(contextCopy.saveSuccess, { variant: 'success' });
    }
    setIsSaving(false);
  }, [
    catalog,
    contextCopy.saveError,
    contextCopy.saveFactoryError,
    contextCopy.saveSuccess,
    draft,
    selectedId,
    toast,
    updateSetting,
  ]);

  const updateCatalog = useCallback((nextRaw: string) => {
    setCatalogOverrideRaw(nextRaw);
  }, []);

  const stateValue = useMemo<AppearancePageStateContextValue>(
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
    ]
  );

  const actionsValue = useMemo<AppearancePageActionsContextValue>(
    () => ({
      handleAssignToSlot,
      handleDefaultModeChange,
      handleResetToFactory,
      handleSave,
      handleSelect,
      handleUnassignFromSlot,
      setDraft,
      updateCatalog,
    }),
    [
      handleAssignToSlot,
      handleDefaultModeChange,
      handleResetToFactory,
      handleSave,
      handleSelect,
      handleUnassignFromSlot,
      setDraft,
      updateCatalog,
    ]
  );

  const value = useMemo<AppearancePageContextValue>(
    () => ({ ...stateValue, ...actionsValue }),
    [actionsValue, stateValue]
  );

  return (
    <AppearancePageActionsContext.Provider value={actionsValue}>
      <AppearancePageStateContext.Provider value={stateValue}>
        <AppearancePageContext.Provider value={value}>
          {children}
        </AppearancePageContext.Provider>
      </AppearancePageStateContext.Provider>
    </AppearancePageActionsContext.Provider>
  );
}

export function useAppearancePage(): AppearancePageContextValue {
  const context = useContext(AppearancePageContext);
  if (!context) {
    throw internalError('useAppearancePage must be used within an AppearancePageProvider');
  }
  return context;
}

export function useAppearancePageState(): AppearancePageStateContextValue {
  const context = useContext(AppearancePageStateContext);
  if (!context) {
    throw internalError('useAppearancePageState must be used within an AppearancePageProvider');
  }
  return context;
}

export function useAppearancePageActions(): AppearancePageActionsContextValue {
  const context = useContext(AppearancePageActionsContext);
  if (!context) {
    throw internalError('useAppearancePageActions must be used within an AppearancePageProvider');
  }
  return context;
}
