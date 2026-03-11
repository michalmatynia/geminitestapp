'use client';

import { useEffect, useMemo, useState } from 'react';

import { useOfflineQueueStatus } from '@/shared/hooks/offline';
import { useOfflineSync } from '@/shared/hooks/offline/useOfflineMutation';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  useBackgroundSyncActions,
  useBackgroundSyncState,
} from '@/shared/providers/BackgroundSyncProvider';
import {
  AdminSettingsPageLayout,
  Button,
  Card,
  FormActions,
  FormField,
  FormSection,
  Hint,
  Input,
  MetadataItem,
  SimpleSettingsList,
  ToggleRow,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

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
  const { intervalSeconds: syncIntervalSeconds, isOnline, lastSync } = useBackgroundSyncState();
  const { forceSync } = useBackgroundSyncActions();
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
    forceSync();
    toast('Sync triggered', { variant: 'success' });
  };

  const handleProcessQueue = async (): Promise<void> => {
    try {
      await processQueue();
      offlineQueue.refresh();
      toast('Offline queue processed', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminSyncSettingsPage', action: 'processQueue' },
      });
      toast(error instanceof Error ? error.message : 'Failed to process queue', {
        variant: 'error',
      });
    }
  };

  const handleClearQueue = (): void => {
    offlineQueue.clear();
    toast('Offline queue cleared', { variant: 'success' });
  };

  return (
    <AdminSettingsPageLayout
      title='Background Sync'
      current='Background Sync'
      description='Control background synchronization and manage the offline mutation queue.'
    >
      <ConfirmModal
        isOpen={isClearQueueConfirmOpen}
        onClose={() => setIsClearQueueConfirmOpen(false)}
        onConfirm={handleClearQueue}
        title='Clear Offline Queue'
        message="This will remove all pending mutations that haven't been synced to the server yet. This action cannot be undone."
        confirmText='Clear All'
        isDangerous={true}
      />

      <div className='grid gap-6 lg:grid-cols-2'>
        <FormSection
          title='Sync Schedule'
          description='Toggle background synchronization and set the refresh interval.'
          className='p-6'
        >
          <ToggleRow
            variant='switch'
            label='Enable Background Sync'
            description='Allow the application to synchronize data in the background.'
            checked={enabled}
            onCheckedChange={setEnabled}
            className='mb-4'
          />

          <FormField label='Interval (seconds)'>
            <Input
              id='sync-interval'
              type='number'
              min={10}
              max={3600}
              value={intervalSeconds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setIntervalSeconds(Number(event.target.value))
              }
            />
            <Hint className='mt-1'>Between 10 seconds and 1 hour.</Hint>
          </FormField>

          <FormActions
            onSave={handleSave}
            isDisabled={!isDirty || updateSettingsBulk.isPending}
            isSaving={updateSettingsBulk.isPending}
            saveText='Save Settings'
            className='justify-start'
          >
            <Button variant='outline' onClick={handleForceSync} size='sm'>
              Run Sync Now
            </Button>
          </FormActions>

          <Card
            variant='subtle-compact'
            padding='md'
            className='border-border bg-muted/20 space-y-2'
          >
            <MetadataItem
              label='Status'
              value={isOnline ? 'Online' : 'Offline'}
              valueClassName={isOnline ? 'text-emerald-300' : 'text-rose-300'}
              variant='minimal'
            />
            <MetadataItem
              label='Last sync'
              value={lastSync ? lastSync.toLocaleTimeString() : 'Never'}
              variant='minimal'
            />
            <MetadataItem
              label='Active interval'
              value={`${syncIntervalSeconds}s`}
              variant='minimal'
            />
          </Card>
        </FormSection>

        <FormSection
          title='Offline Queue'
          description='Review queued mutations and clear or process them manually.'
          className='p-6'
        >
          <MetadataItem
            label='Queued items'
            value={offlineQueue.count}
            variant='minimal'
            className='mb-4'
          />

          <div className='flex flex-wrap gap-3 mb-4'>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                void handleProcessQueue();
              }}
            >
              Process Queue
            </Button>
            <Button variant='outline' size='sm' onClick={(): void => offlineQueue.refresh()}>
              Refresh
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='text-red-200 hover:text-red-100'
              onClick={() => setIsClearQueueConfirmOpen(true)}
            >
              Clear Queue
            </Button>
          </div>

          <SimpleSettingsList
            items={offlineQueue.items.map((item) => ({
              id: item.id,
              title: JSON.stringify(item.queryKey),
              subtitle: new Date(item.timestamp).toLocaleString(),
            }))}
            emptyMessage='No pending synchronization mutations.'
            padding='sm'
            itemClassName='!bg-muted/10 border-white/10'
            className='max-h-60 overflow-y-auto'
          />
        </FormSection>
      </div>
    </AdminSettingsPageLayout>
  );
}
