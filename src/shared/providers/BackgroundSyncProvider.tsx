'use client';

import { useEffect, useMemo, useState } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useSystemSync } from '@/shared/hooks/sync/useSystemSync';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import type { JSX } from 'react';

type QueryDevPanelComponent = typeof import('@/shared/ui/QueryDevPanel')['QueryDevPanel'];

let cachedQueryDevPanel: QueryDevPanelComponent | null = null;
let queryDevPanelPromise: Promise<QueryDevPanelComponent> | null = null;

const loadQueryDevPanel = async (): Promise<QueryDevPanelComponent> => {
  if (cachedQueryDevPanel) {
    return cachedQueryDevPanel;
  }

  if (!queryDevPanelPromise) {
    queryDevPanelPromise = import('@/shared/ui/QueryDevPanel').then((module) => {
      cachedQueryDevPanel = module.QueryDevPanel;
      return module.QueryDevPanel;
    });
  }

  return queryDevPanelPromise;
};

type BackgroundSyncContextValue = {
  enabled: boolean;
  intervalSeconds: number;
  isOnline: boolean;
  lastSync: Date | null;
  forceSync: () => void;
};

type BackgroundSyncStateContextValue = Omit<BackgroundSyncContextValue, 'forceSync'>;
type BackgroundSyncActionsContextValue = Pick<BackgroundSyncContextValue, 'forceSync'>;

const {
  Context: BackgroundSyncStateContext,
  useStrictContext: useBackgroundSyncState,
} = createStrictContext<BackgroundSyncStateContextValue>({
  hookName: 'useBackgroundSyncState',
  providerName: 'BackgroundSyncProvider',
  displayName: 'BackgroundSyncStateContext',
});

const {
  Context: BackgroundSyncActionsContext,
  useStrictContext: useBackgroundSyncActions,
} = createStrictContext<BackgroundSyncActionsContextValue>({
  hookName: 'useBackgroundSyncActions',
  providerName: 'BackgroundSyncProvider',
  displayName: 'BackgroundSyncActionsContext',
});

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
}): JSX.Element {
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
  const shouldLoadQueryDevPanel =
    resolvedSettings.queryPanelEnabled || resolvedSettings.queryPanelOpen;
  const [queryDevPanelComponent, setQueryDevPanelComponent] =
    useState<QueryDevPanelComponent | null>(cachedQueryDevPanel);

  useEffect(() => {
    if (queryDevPanelComponent || !shouldLoadQueryDevPanel) {
      return;
    }

    let cancelled = false;

    void loadQueryDevPanel().then((component) => {
      if (!cancelled) {
        setQueryDevPanelComponent(() => component);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [queryDevPanelComponent, shouldLoadQueryDevPanel]);

  const QueryDevPanel = queryDevPanelComponent;

  return (
    <BackgroundSyncActionsContext.Provider value={actionsValue}>
      <BackgroundSyncStateContext.Provider value={stateValue}>
        {children}
        {QueryDevPanel ? (
          <QueryDevPanel
            isOnline={isOnline}
            lastSync={lastSync}
            enabled={resolvedSettings.queryPanelEnabled}
            open={resolvedSettings.queryPanelOpen}
          />
        ) : null}
      </BackgroundSyncStateContext.Provider>
    </BackgroundSyncActionsContext.Provider>
  );
}

export { useBackgroundSyncState, useBackgroundSyncActions };
