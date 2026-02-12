'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useOfflineQueueStatus, type OfflineQueueItem } from '@/shared/hooks/offline';
import { useOfflineSync } from '@/shared/hooks/offline/useOfflineMutation';
import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useBackgroundSyncStatus } from '@/shared/providers/BackgroundSyncProvider';
import {
  Button,
  Input,
  Label,
  SectionHeader,
  SectionPanel,
  Switch,
  useToast,
  ConfirmDialog,
} from '@/shared/ui';

const BACKGROUND_SYNC_KEYS = {
  enabled: 'background_sync_enabled',
  intervalSeconds: 'background_sync_interval_seconds',
};

const parseEnabled = (value: string | undefined): boolean => {
  if (!value) return true;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const parseIntervalSeconds = (value: string | undefined): number => {
  if (!value) return 60;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(Math.max(parsed, 10), 3600);
};

export function AdminSyncSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const syncStatus = useBackgroundSyncStatus();
  const { processQueue } = useOfflineSync();
  const offlineQueue = useOfflineQueueStatus();

  const storedEnabled = useMemo(
    () => parseEnabled(settingsQuery.data?.get(BACKGROUND_SYNC_KEYS.enabled)),
    [settingsQuery.data]
  );
  const storedInterval = useMemo(
    () => parseIntervalSeconds(settingsQuery.data?.get(BACKGROUND_SYNC_KEYS.intervalSeconds)),
    [settingsQuery.data]
  );

  const [enabled, setEnabled] = useState(storedEnabled);
  const [intervalSeconds, setIntervalSeconds] = useState(storedInterval);
  const [isClearQueueConfirmOpen, setIsClearQueueConfirmOpen] = useState(false);

  useEffect(() => {
    setEnabled(storedEnabled);
  }, [storedEnabled]);

  useEffect(() => {
    setIntervalSeconds(storedInterval);
  }, [storedInterval]);

  const isDirty = enabled !== storedEnabled || intervalSeconds !== storedInterval;

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
          toast(error.message || 'Failed to save settings', { variant: 'error' });
        },
      }
    );
  };

  const handleForceSync = (): void => {
    syncStatus.forceSync();
    toast('Sync triggered', { variant: 'success' });
  };

  const handleProcessQueue = async (): Promise<void> => {
    try {
      await processQueue();
      offlineQueue.refresh();
      toast('Offline queue processed', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminSyncSettingsPage', action: 'processQueue' } });
      toast(error instanceof Error ? error.message : 'Failed to process queue', { variant: 'error' });
    }
  };

  const handleClearQueue = (): void => {
    offlineQueue.clear();
    toast('Offline queue cleared', { variant: 'success' });
  };

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Background Sync'
        description='Control background synchronization and manage the offline mutation queue.'
        eyebrow={
          <Link href='/admin/settings' className='text-blue-300 hover:text-blue-200'>
            ← Back to settings
          </Link>
        }
        className='mb-8'
      />

      <ConfirmDialog
        open={isClearQueueConfirmOpen}
        onOpenChange={setIsClearQueueConfirmOpen}
        onConfirm={handleClearQueue}
        title='Clear Offline Queue'
        description="This will remove all pending mutations that haven't been synced to the server yet. This action cannot be undone."
        confirmText='Clear All'
        variant='destructive'
      />

      <div className='grid gap-6 lg:grid-cols-2'>
        <SectionPanel className='p-6 space-y-6'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h3 className='text-sm font-semibold text-white'>Sync Schedule</h3>
              <p className='mt-1 text-sm text-gray-400'>
                Toggle background synchronization and set the refresh interval.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={(val: boolean): void => setEnabled(val)} />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='sync-interval'>Interval (seconds)</Label>
            <Input
              id='sync-interval'
              type='number'
              min={10}
              max={3600}
              value={intervalSeconds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setIntervalSeconds(Number(event.target.value))}
            />
            <p className='text-xs text-gray-400'>Between 10 seconds and 1 hour.</p>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button onClick={handleSave} disabled={!isDirty || updateSettingsBulk.isPending}>
              {updateSettingsBulk.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant='outline' onClick={handleForceSync}>
              Run Sync Now
            </Button>
          </div>

          <div className='rounded-lg border border-border bg-muted/20 p-4 text-sm text-gray-300 space-y-1'>
            <div className='flex justify-between'>
              <span>Status</span>
              <span className={syncStatus.isOnline ? 'text-emerald-300' : 'text-rose-300'}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Last sync</span>
              <span>{syncStatus.lastSync ? syncStatus.lastSync.toLocaleTimeString() : 'Never'}</span>
            </div>
            <div className='flex justify-between'>
              <span>Active interval</span>
              <span>{syncStatus.intervalSeconds}s</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel className='p-6 space-y-6'>
          <div>
            <h3 className='text-sm font-semibold text-white'>Offline Queue</h3>
            <p className='mt-1 text-sm text-gray-400'>
              Review queued mutations and clear or process them manually.
            </p>
          </div>

          <div className='rounded-lg border border-border bg-muted/20 p-4 text-sm text-gray-300 space-y-1'>
            <div className='flex justify-between'>
              <span>Queued items</span>
              <span>{offlineQueue.count}</span>
            </div>
          </div>

          <div className='flex flex-wrap gap-3'>
            <Button variant='outline' onClick={(): void => { void handleProcessQueue(); }}>
              Process Queue
            </Button>
            <Button variant='outline' onClick={(): void => offlineQueue.refresh()}>
              Refresh
            </Button>
            <Button variant='outline' className='text-red-200 hover:text-red-100' onClick={() => setIsClearQueueConfirmOpen(true)}>
              Clear Queue
            </Button>
          </div>

          <div className='max-h-60 space-y-2 overflow-y-auto rounded border border-border bg-muted/10 p-3 text-xs text-gray-300'>
            {offlineQueue.items.length === 0 ? (
              <p className='text-center text-gray-500'>No queued mutations.</p>
            ) : (
              offlineQueue.items.map((item: OfflineQueueItem) => (
                <div key={item.id} className='rounded border border-white/10 p-2'>
                  <div className='truncate text-gray-200'>{JSON.stringify(item.queryKey)}</div>
                  <div className='mt-1 text-[10px] text-gray-500'>
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
