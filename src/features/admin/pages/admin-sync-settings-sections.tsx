'use client';

import { Button, Card, Input } from '@/shared/ui/primitives.public';
import {
  FormActions,
  FormField,
  FormSection,
  Hint,
  ToggleRow,
} from '@/shared/ui/forms-and-actions.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';

import type { OfflineQueueListItem } from './useAdminSyncSettingsController';

function SyncIntervalField({
  intervalSeconds,
  setIntervalSeconds,
}: {
  intervalSeconds: number;
  setIntervalSeconds: (value: number) => void;
}): React.JSX.Element {
  return (
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
        aria-label='Interval (seconds)'
        title='Interval (seconds)'
      />
      <Hint className='mt-1'>Between 10 seconds and 1 hour.</Hint>
    </FormField>
  );
}

function SyncStatusCard({
  isOnline,
  lastSync,
  syncIntervalSeconds,
}: {
  isOnline: boolean;
  lastSync: Date | null;
  syncIntervalSeconds: number;
}): React.JSX.Element {
  return (
    <Card
      variant='subtle-compact'
      padding='md'
      className='space-y-2 border-border bg-muted/20'
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
  );
}

function SyncActions({
  handleForceSync,
  handleSave,
  isDirty,
  isSaving,
}: {
  handleForceSync: () => void;
  handleSave: () => void;
  isDirty: boolean;
  isSaving: boolean;
}): React.JSX.Element {
  return (
    <FormActions
      onSave={handleSave}
      isDisabled={!isDirty || isSaving}
      isSaving={isSaving}
      saveText='Save Settings'
      className='justify-start'
    >
      <Button variant='outline' onClick={handleForceSync} size='sm'>
        Run Sync Now
      </Button>
    </FormActions>
  );
}

export function SyncScheduleSection({
  enabled,
  handleForceSync,
  handleSave,
  intervalSeconds,
  isDirty,
  isOnline,
  isSaving,
  lastSync,
  setEnabled,
  setIntervalSeconds,
  syncIntervalSeconds,
}: {
  enabled: boolean;
  handleForceSync: () => void;
  handleSave: () => void;
  intervalSeconds: number;
  isDirty: boolean;
  isOnline: boolean;
  isSaving: boolean;
  lastSync: Date | null;
  setEnabled: (value: boolean) => void;
  setIntervalSeconds: (value: number) => void;
  syncIntervalSeconds: number;
}): React.JSX.Element {
  return (
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

      <SyncIntervalField
        intervalSeconds={intervalSeconds}
        setIntervalSeconds={setIntervalSeconds}
      />

      <SyncActions
        handleForceSync={handleForceSync}
        handleSave={handleSave}
        isDirty={isDirty}
        isSaving={isSaving}
      />

      <SyncStatusCard
        isOnline={isOnline}
        lastSync={lastSync}
        syncIntervalSeconds={syncIntervalSeconds}
      />
    </FormSection>
  );
}

export function OfflineQueueSection({
  count,
  handleProcessQueueClick,
  items,
  openClearQueueConfirm,
  refreshQueue,
}: {
  count: number;
  handleProcessQueueClick: () => void;
  items: OfflineQueueListItem[];
  openClearQueueConfirm: () => void;
  refreshQueue: () => void;
}): React.JSX.Element {
  return (
    <FormSection
      title='Offline Queue'
      description='Review queued mutations and clear or process them manually.'
      className='p-6'
    >
      <MetadataItem
        label='Queued items'
        value={count}
        variant='minimal'
        className='mb-4'
      />

      <div className='mb-4 flex flex-wrap gap-3'>
        <Button variant='outline' size='sm' onClick={handleProcessQueueClick}>
          Process Queue
        </Button>
        <Button variant='outline' size='sm' onClick={refreshQueue}>
          Refresh
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='text-red-200 hover:text-red-100'
          onClick={openClearQueueConfirm}
        >
          Clear Queue
        </Button>
      </div>

      <SimpleSettingsList
        items={items}
        emptyMessage='No pending synchronization mutations.'
        padding='sm'
        itemClassName='!bg-muted/10 border-white/10'
        className='max-h-60 overflow-y-auto'
      />
    </FormSection>
  );
}
