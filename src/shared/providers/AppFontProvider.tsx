"use client";

import { useEffect, useMemo } from "react";
import { useSettingsStore } from "@/shared/providers/SettingsStoreProvider";
import {
  APP_FONT_SET_SETTING_KEY,
  getAppFontSet,
  type AppFontSetId,
} from "@/shared/constants/typography";

const LOCAL_STORAGE_KEY = "app_font_set_id";

function applyFontSet(id: AppFontSetId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.appFontSet = id;
}

export function AppFontProvider(): null {
  const settingsStore = useSettingsStore();

  const stored = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LOCAL_STORAGE_KEY);
  }, []);

  // Apply last-used choice ASAP to reduce flicker.
  useEffect(() => {
    const initial = getAppFontSet(stored).id;
    applyFontSet(initial);
  }, [stored]);

  const fontSetting = settingsStore.get(APP_FONT_SET_SETTING_KEY);

  useEffect(() => {
    const id = getAppFontSet(fontSetting).id;
    applyFontSet(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, id);
    }
  }, [fontSetting]);

  return null;
}
