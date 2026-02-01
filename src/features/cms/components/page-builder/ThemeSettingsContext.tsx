"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import {
  CMS_THEME_SETTINGS_KEY,
  DEFAULT_THEME,
  normalizeThemeSettings,
  type ThemeSettings,
} from "@/features/cms/types/theme-settings";

interface ThemeSettingsContextValue {
  theme: ThemeSettings;
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  update: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
}

const ThemeSettingsContext = createContext<ThemeSettingsContextValue | undefined>(undefined);

export function ThemeSettingsProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const hasHydratedRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);

  const initialTheme = useMemo((): ThemeSettings => {
    if (!settingsQuery.isFetched) return DEFAULT_THEME;
    const stored = parseJsonSetting<Partial<ThemeSettings> | null>(
      settingsQuery.data?.get(CMS_THEME_SETTINGS_KEY),
      null
    );
    return normalizeThemeSettings(stored);
  }, [settingsQuery.data, settingsQuery.isFetched]);

  const [userTheme, setUserTheme] = useState<ThemeSettings | null>(null);
  const theme = userTheme ?? initialTheme;

  const lastSavedRef = useRef<string>(serializeSetting(initialTheme));

  useEffect((): void => {
    if (settingsQuery.isFetched) {
      hasHydratedRef.current = true;
    }
  }, [settingsQuery.isFetched]);

  useEffect((): void => {
    if (!hasHydratedRef.current) return;
    if (!userTheme) return;
    const nextSerialized = serializeSetting(userTheme);
    if (nextSerialized === lastSavedRef.current) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      lastSavedRef.current = nextSerialized;
      updateSetting.mutate({ key: CMS_THEME_SETTINGS_KEY, value: nextSerialized });
    }, 500);
  }, [userTheme, updateSetting]);

  useEffect((): () => void => {
    return (): void => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, []);

  const update = useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]): void => {
    setUserTheme((prev: ThemeSettings | null) => ({ ...(prev ?? initialTheme), [key]: value }));
  }, [initialTheme]);

  const setThemeProxy = useCallback((val: React.SetStateAction<ThemeSettings>): void => {
    setUserTheme((prev: ThemeSettings | null) => {
      const current = prev ?? initialTheme;
      if (typeof val === "function") {
        return (val as (prevState: ThemeSettings) => ThemeSettings)(current);
      }
      return val;
    });
  }, [initialTheme]);

  const value = useMemo(() => ({ theme, setTheme: setThemeProxy, update }), [theme, update, setThemeProxy]);
  return (
    <ThemeSettingsContext.Provider value={value}>
      {children}
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings(): ThemeSettingsContextValue {
  const ctx = useContext(ThemeSettingsContext);
  if (!ctx) {
    throw new Error("useThemeSettings must be used within ThemeSettingsProvider");
  }
  return ctx;
}
