"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useSystemSync } from "@/shared/hooks/useSystemSync";
import { useSettingsMap } from "@/shared/hooks/use-settings";
import { QueryDevPanel } from "@/shared/ui";

type BackgroundSyncContextValue = {
  enabled: boolean;
  intervalSeconds: number;
  isOnline: boolean;
  lastSync: Date | null;
  forceSync: () => void;
};

const BackgroundSyncContext = createContext<BackgroundSyncContextValue | null>(null);

const BACKGROUND_SYNC_KEYS = {
  enabled: "background_sync_enabled",
  intervalSeconds: "background_sync_interval_seconds",
};

const QUERY_PANEL_KEYS = {
  enabled: "query_status_panel_enabled",
  open: "query_status_panel_open",
};

const parseEnabled = (value: string | undefined): boolean => {
  if (!value) return true;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

const parseIntervalSeconds = (value: string | undefined): number => {
  if (!value) return 60;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(Math.max(parsed, 10), 3600);
};

export function BackgroundSyncProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const settingsQuery = useSettingsMap();
  const resolvedSettings = useMemo(() => {
    const map = settingsQuery.data;
    return {
      enabled: parseEnabled(map?.get(BACKGROUND_SYNC_KEYS.enabled)),
      intervalSeconds: parseIntervalSeconds(map?.get(BACKGROUND_SYNC_KEYS.intervalSeconds)),
      queryPanelEnabled: parseEnabled(map?.get(QUERY_PANEL_KEYS.enabled)),
      queryPanelOpen: parseEnabled(map?.get(QUERY_PANEL_KEYS.open)),
    };
  }, [settingsQuery.data]);

  const { isOnline, lastSync, forceSync } = useSystemSync({
    enabled: resolvedSettings.enabled,
    interval: resolvedSettings.intervalSeconds * 1000,
  });

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Background sync status:", { isOnline, lastSync });
    }
  }, [isOnline, lastSync]);

  const value = useMemo(
    () => ({
      enabled: resolvedSettings.enabled,
      intervalSeconds: resolvedSettings.intervalSeconds,
      isOnline,
      lastSync,
      forceSync,
    }),
    [resolvedSettings.enabled, resolvedSettings.intervalSeconds, isOnline, lastSync, forceSync]
  );

  return (
    <BackgroundSyncContext.Provider value={value}>
      {children}
      <QueryDevPanel
        isOnline={isOnline}
        lastSync={lastSync}
        enabled={resolvedSettings.queryPanelEnabled}
        open={resolvedSettings.queryPanelOpen}
      />
    </BackgroundSyncContext.Provider>
  );
}

export function useBackgroundSyncStatus(): BackgroundSyncContextValue {
  const context = useContext(BackgroundSyncContext);
  if (!context) {
    throw new Error("useBackgroundSyncStatus must be used within BackgroundSyncProvider");
  }
  return context;
}
