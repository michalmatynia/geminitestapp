'use client';

import { useEffect, useMemo, useState } from 'react';

import { useOfflineQueueStatus } from '@/shared/hooks/offline';
import { useOfflineSync } from '@/shared/hooks/offline/useOfflineMutation';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  useBackgroundSyncActions,
  useBackgroundSyncState,
} from '@/shared/providers/BackgroundSyncProvider';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

const BACKGROUND_SYNC_KEYS = {
  enabled: 'background_sync_enabled',
  intervalSeconds: 'background_sync_interval_seconds',
};

const parseEnabled = (value: string | undefined): boolean => {
  if (value === undefined || value === '') return true;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const parseIntervalSeconds = (value: string | undefined): number => {
  if (value === undefined || value === '') return 60;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(Math.max(parsed, 10), 3600);
};

export type OfflineQueueListItem = {
  id: string;
  subtitle: string;
  title: string;
};

export type AdminSyncSettingsController = {
  enabled: boolean;
  handleClearQueue: () => void;
  handleForceSync: () => void;
  handleProcessQueueClick: () => void;
  handleSave: () => void;
  intervalSeconds: number;
  isClearQueueConfirmOpen: boolean;
  isDirty: boolean;
  isOnline: boolean;
  isSaving: boolean;
  lastSync: Date | null;
  queueCount: number;
  queueItems: OfflineQueueListItem[];
  refreshQueue: () => void;
  setEnabled: (value: boolean) => void;
  setIntervalSeconds: (value: number) => void;
  setIsClearQueueConfirmOpen: (value: boolean) => void;
  syncIntervalSeconds: number;
};

type BackgroundSyncFormState = {
  enabled: boolean;
  intervalSeconds: number;
  isDirty: boolean;
  setEnabled: (value: boolean) => void;
  setIntervalSeconds: (value: number) => void;
};

type BackgroundSyncHandlers = {
  handleClearQueue: () => void;
  handleForceSync: () => void;
  handleProcessQueueClick: () => void;
  handleSave: () => void;
};

function useBackgroundSyncFormState(
  settingsData: ReturnType<typeof useSettingsMap>['data']
): BackgroundSyncFormState {
  const storedEnabled = useMemo(
    () => parseEnabled(settingsData?.get(BACKGROUND_SYNC_KEYS.enabled)),
    [settingsData]
  );
  const storedInterval = useMemo(
    () => parseIntervalSeconds(settingsData?.get(BACKGROUND_SYNC_KEYS.intervalSeconds)),
    [settingsData]
  );
  const [enabled, setEnabled] = useState(storedEnabled);
  const [intervalSeconds, setIntervalSeconds] = useState(storedInterval);

  useEffect(() => {
    setEnabled(storedEnabled);
  }, [storedEnabled]);

  useEffect(() => {
    setIntervalSeconds(storedInterval);
  }, [storedInterval]);

  return {
    enabled,
    intervalSeconds,
    isDirty: enabled !== storedEnabled || intervalSeconds !== storedInterval,
    setEnabled,
    setIntervalSeconds,
  };
}

function useBackgroundSyncHandlers(params: {
  enabled: boolean;
  intervalSeconds: number;
  offlineQueue: ReturnType<typeof useOfflineQueueStatus>;
  processQueue: () => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
  updateSettingsBulk: ReturnType<typeof useUpdateSettingsBulk>;
  forceSync: () => void;
}): BackgroundSyncHandlers {
  const { enabled, forceSync, intervalSeconds, offlineQueue, processQueue, toast, updateSettingsBulk } =
    params;

  const handleSave = (): void => {
    updateSettingsBulk.mutate(
      [
        { key: BACKGROUND_SYNC_KEYS.enabled, value: enabled ? 'true' : 'false' },
        { key: BACKGROUND_SYNC_KEYS.intervalSeconds, value: String(intervalSeconds) },
      ],
      {
        onSuccess: (): void => {
          toast('Background sync settings saved', { variant: 'success' });
        },
        onError: (error: Error): void => {
          logClientError(error, { context: { source: 'AdminSyncSettingsPage', action: 'save' } });
          const errorMessage = error.message !== '' ? error.message : 'Failed to save settings';
          toast(errorMessage, { variant: 'error' });
        },
      }
    );
  };

  const handleForceSync = (): void => {
    forceSync();
    toast('Sync triggered', { variant: 'success' });
  };

  const handleProcessQueue = async (): Promise<void> => {
    try {
      await processQueue();
      offlineQueue.refresh();
      toast('Offline queue processed', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AdminSyncSettingsPage', action: 'processQueue' });
      toast(error instanceof Error ? error.message : 'Failed to process queue', {
        variant: 'error',
      });
    }
  };

  const handleClearQueue = (): void => {
    offlineQueue.clear();
    toast('Offline queue cleared', { variant: 'success' });
  };

  const handleProcessQueueClick = (): void => {
    handleProcessQueue().catch(logClientCatch);
  };

  return {
    handleClearQueue,
    handleForceSync,
    handleProcessQueueClick,
    handleSave,
  };
}

function buildQueueItems(
  items: ReturnType<typeof useOfflineQueueStatus>['items']
): OfflineQueueListItem[] {
  return items.map((item) => ({
    id: item.id,
    title: JSON.stringify(item.queryKey),
    subtitle: new Date(item.timestamp).toLocaleString(),
  }));
}

export function useAdminSyncSettingsController(): AdminSyncSettingsController {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const { intervalSeconds: syncIntervalSeconds, isOnline, lastSync } = useBackgroundSyncState();
  const { forceSync } = useBackgroundSyncActions();
  const { processQueue } = useOfflineSync();
  const offlineQueue = useOfflineQueueStatus();
  const [isClearQueueConfirmOpen, setIsClearQueueConfirmOpen] = useState(false);
  const formState = useBackgroundSyncFormState(settingsQuery.data);
  const handlers = useBackgroundSyncHandlers({
    enabled: formState.enabled,
    forceSync,
    intervalSeconds: formState.intervalSeconds,
    offlineQueue,
    processQueue,
    toast,
    updateSettingsBulk,
  });

  return {
    ...formState,
    ...handlers,
    isClearQueueConfirmOpen,
    isOnline,
    isSaving: updateSettingsBulk.isPending,
    lastSync,
    queueCount: offlineQueue.count,
    queueItems: buildQueueItems(offlineQueue.items),
    refreshQueue: () => offlineQueue.refresh(),
    setIsClearQueueConfirmOpen,
    syncIntervalSeconds,
  };
}
