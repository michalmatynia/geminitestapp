"use client";

import { useEffect, useMemo } from "react";
import { useSettingsMap } from "@/shared/hooks/use-settings";
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
  const settingsQuery = useSettingsMap();

  const stored = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LOCAL_STORAGE_KEY);
  }, []);

  // Apply last-used choice ASAP to reduce flicker.
  useEffect(() => {
    const initial = getAppFontSet(stored).id;
    applyFontSet(initial);
  }, [stored]);

  useEffect(() => {
    const id = getAppFontSet(settingsQuery.data?.get(APP_FONT_SET_SETTING_KEY)).id;
    applyFontSet(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, id);
    }
  }, [settingsQuery.data]);

  return null;
}

