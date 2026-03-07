'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  CMS_THEME_SETTINGS_KEY,
  DEFAULT_THEME,
  normalizeThemeSettings,
  type ThemeSettings,
} from '@/shared/contracts/cms-theme';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

interface ThemeSettingsStateContextValue {
  theme: ThemeSettings;
}

interface ThemeSettingsActionsContextValue {
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  update: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
}

const ThemeSettingsStateContext = createContext<ThemeSettingsStateContextValue | undefined>(
  undefined
);
const ThemeSettingsActionsContext = createContext<ThemeSettingsActionsContextValue | undefined>(
  undefined
);

export function ThemeSettingsProvider({
  storageKey = CMS_THEME_SETTINGS_KEY,
  children,
}: {
  storageKey?: string;
  children: React.ReactNode;
}): React.ReactNode {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const hasHydratedRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);
  const settingsReady = !settingsStore.isLoading && !settingsStore.error;
  const themeSettingsRaw = settingsStore.get(storageKey);

  const initialTheme = useMemo((): ThemeSettings => {
    if (!settingsReady) return DEFAULT_THEME;
    const stored = parseJsonSetting<Partial<ThemeSettings> | null>(themeSettingsRaw, null);
    return normalizeThemeSettings(stored);
  }, [settingsReady, themeSettingsRaw]);

  const [userTheme, setUserTheme] = useState<ThemeSettings | null>(null);
  const theme = userTheme ?? initialTheme;

  const lastSavedRef = useRef<string>(serializeSetting(initialTheme));

  useEffect((): void => {
    if (settingsReady) {
      hasHydratedRef.current = true;
    }
  }, [settingsReady]);

  useEffect((): void => {
    if (!hasHydratedRef.current) return;
    if (!userTheme) return;
    const nextSerialized = serializeSetting(userTheme);
    if (nextSerialized === lastSavedRef.current) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      lastSavedRef.current = nextSerialized;
      updateSetting.mutate({ key: storageKey, value: nextSerialized });
    }, 500);
  }, [storageKey, userTheme, updateSetting]);

  useEffect((): (() => void) => {
    return (): void => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, []);

  const update = useCallback(
    <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]): void => {
      setUserTheme((prev: ThemeSettings | null) => ({ ...(prev ?? initialTheme), [key]: value }));
    },
    [initialTheme]
  );

  const setThemeProxy = useCallback(
    (val: React.SetStateAction<ThemeSettings>): void => {
      setUserTheme((prev: ThemeSettings | null) => {
        const current = prev ?? initialTheme;
        if (typeof val === 'function') {
          return (val as (prevState: ThemeSettings) => ThemeSettings)(current);
        }
        return val;
      });
    },
    [initialTheme]
  );

  const value = useMemo((): ThemeSettingsStateContextValue => ({ theme }), [theme]);
  const actions = useMemo(
    (): ThemeSettingsActionsContextValue => ({
      setTheme: setThemeProxy,
      update,
    }),
    [setThemeProxy, update]
  );

  return (
    <ThemeSettingsActionsContext.Provider value={actions}>
      <ThemeSettingsStateContext.Provider value={value}>
        {children}
      </ThemeSettingsStateContext.Provider>
    </ThemeSettingsActionsContext.Provider>
  );
}

export function useThemeSettingsValue(): ThemeSettings {
  const ctx = useContext(ThemeSettingsStateContext);
  if (!ctx) {
    throw new Error('useThemeSettingsValue must be used within ThemeSettingsProvider');
  }
  return ctx.theme;
}

export function useThemeSettingsActions(): ThemeSettingsActionsContextValue {
  const ctx = useContext(ThemeSettingsActionsContext);
  if (!ctx) {
    throw new Error('useThemeSettingsActions must be used within ThemeSettingsProvider');
  }
  return ctx;
}
