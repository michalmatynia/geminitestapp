'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';

import { useSystemSync } from '@/shared/hooks/sync/useSystemSync';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { QueryDevPanel } from '@/shared/ui';

type BackgroundSyncContextValue = {
  enabled: boolean;
  intervalSeconds: number;
  isOnline: boolean;
  lastSync: Date | null;
  forceSync: () => void;
};

type BackgroundSyncStateContextValue = Omit<BackgroundSyncContextValue, 'forceSync'>;
type BackgroundSyncActionsContextValue = Pick<BackgroundSyncContextValue, 'forceSync'>;

const BackgroundSyncStateContext = createContext<BackgroundSyncStateContextValue | null>(null);
const BackgroundSyncActionsContext = createContext<BackgroundSyncActionsContextValue | null>(null);

const BACKGROUND_SYNC_KEYS = {
  enabled: 'background_sync_enabled',
  intervalSeconds: 'background_sync_interval_seconds',
};

const QUERY_PANEL_KEYS = {
  enabled: 'query_status_panel_enabled',
  open: 'query_status_panel_open',
};

const parseEnabled = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const parseIntervalSeconds = (value: string | undefined): number => {
  if (!value) return 300;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 300;
  return Math.min(Math.max(parsed, 60), 3600);
};

export function BackgroundSyncProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const resolvedSettings = useMemo(() => {
    const map = settingsStore.map;
    return {
      enabled: parseEnabled(map?.get(BACKGROUND_SYNC_KEYS.enabled), true),
      intervalSeconds: parseIntervalSeconds(map?.get(BACKGROUND_SYNC_KEYS.intervalSeconds)),
      queryPanelEnabled: parseEnabled(map?.get(QUERY_PANEL_KEYS.enabled), false),
      queryPanelOpen: parseEnabled(map?.get(QUERY_PANEL_KEYS.open), false),
    };
  }, [settingsStore.map]);

  const { isOnline, lastSync, forceSync } = useSystemSync({
    enabled: resolvedSettings.enabled,
    interval: resolvedSettings.intervalSeconds * 1000,
  });

  useEffect(() => {}, [isOnline, lastSync]);

  const stateValue = useMemo(
    () => ({
      enabled: resolvedSettings.enabled,
      intervalSeconds: resolvedSettings.intervalSeconds,
      isOnline,
      lastSync,
    }),
    [resolvedSettings.enabled, resolvedSettings.intervalSeconds, isOnline, lastSync]
  );
  const actionsValue = useMemo(() => ({ forceSync }), [forceSync]);

  return (
    <BackgroundSyncActionsContext.Provider value={actionsValue}>
      <BackgroundSyncStateContext.Provider value={stateValue}>
        {children}
        <QueryDevPanel
          isOnline={isOnline}
          lastSync={lastSync}
          enabled={resolvedSettings.queryPanelEnabled}
          open={resolvedSettings.queryPanelOpen}
        />
      </BackgroundSyncStateContext.Provider>
    </BackgroundSyncActionsContext.Provider>
  );
}

export function useBackgroundSyncState(): BackgroundSyncStateContextValue {
  const context = useContext(BackgroundSyncStateContext);
  if (!context) {
    throw new Error('useBackgroundSyncState must be used within BackgroundSyncProvider');
  }
  return context;
}

export function useBackgroundSyncActions(): BackgroundSyncActionsContextValue {
  const context = useContext(BackgroundSyncActionsContext);
  if (!context) {
    throw new Error('useBackgroundSyncActions must be used within BackgroundSyncProvider');
  }
  return context;
}
