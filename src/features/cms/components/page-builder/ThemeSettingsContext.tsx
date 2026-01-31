"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/useSettings";
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
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const hasHydratedRef = useRef(false);
  const lastSavedRef = useRef<string>(serializeSetting(DEFAULT_THEME));
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasHydratedRef.current) return;
    if (!settingsQuery.isFetched) return;
    const stored = parseJsonSetting<Partial<ThemeSettings> | null>(
      settingsQuery.data?.get(CMS_THEME_SETTINGS_KEY),
      null
    );
    const normalized = normalizeThemeSettings(stored);
    setTheme(normalized);
    lastSavedRef.current = serializeSetting(normalized);
    hasHydratedRef.current = true;
  }, [settingsQuery.data, settingsQuery.isFetched, setTheme]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    const nextSerialized = serializeSetting(theme);
    if (nextSerialized === lastSavedRef.current) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      lastSavedRef.current = nextSerialized;
      updateSetting.mutate({ key: CMS_THEME_SETTINGS_KEY, value: nextSerialized });
    }, 500);
  }, [theme, updateSetting]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, []);

  const update = useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, update }), [theme, update]);
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
