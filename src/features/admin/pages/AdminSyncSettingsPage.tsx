'use client';

import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import {
  OfflineQueueSection,
  SyncScheduleSection,
} from './admin-sync-settings-sections';
import { useAdminSyncSettingsController } from './useAdminSyncSettingsController';

export function AdminSyncSettingsPage(): React.JSX.Element {
  const controller = useAdminSyncSettingsController();

  return (
    <AdminSettingsPageLayout
      title='Background Sync'
      current='Background Sync'
      description='Control background synchronization and manage the offline mutation queue.'
    >
      <ConfirmModal
        isOpen={controller.isClearQueueConfirmOpen}
        onClose={() => controller.setIsClearQueueConfirmOpen(false)}
        onConfirm={controller.handleClearQueue}
        title='Clear Offline Queue'
        message="This will remove all pending mutations that haven't been synced to the server yet. This action cannot be undone."
        confirmText='Clear All'
        isDangerous={true}
      />

      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
        <SyncScheduleSection
          enabled={controller.enabled}
          handleForceSync={controller.handleForceSync}
          handleSave={controller.handleSave}
          intervalSeconds={controller.intervalSeconds}
          isDirty={controller.isDirty}
          isOnline={controller.isOnline}
          isSaving={controller.isSaving}
          lastSync={controller.lastSync}
          setEnabled={controller.setEnabled}
          setIntervalSeconds={controller.setIntervalSeconds}
          syncIntervalSeconds={controller.syncIntervalSeconds}
        />

        <OfflineQueueSection
          count={controller.queueCount}
          handleProcessQueueClick={controller.handleProcessQueueClick}
          items={controller.queueItems}
          openClearQueueConfirm={() => controller.setIsClearQueueConfirmOpen(true)}
          refreshQueue={controller.refreshQueue}
        />
      </div>
    </AdminSettingsPageLayout>
  );
}
