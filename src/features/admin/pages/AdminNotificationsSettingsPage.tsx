'use client';

import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { useNotificationSettingsController } from './notifications/useNotificationSettingsController';
import { NotificationsSettingsForm } from './notifications/NotificationsSettingsForm';
import { NotificationsPreview } from './notifications/NotificationsPreview';
import { accentOptions, positionPreview } from './notifications/types';

function getAccentColor(accent: string): string {
  return accentOptions.find((o) => o.value === accent)?.color ?? 'bg-emerald-500';
}

export function AdminNotificationsSettingsPage(): React.JSX.Element {
  const {
    position,
    setPosition,
    accent,
    setAccent,
    handleSave,
    showPreview,
    accentSelectOptions,
  } = useNotificationSettingsController();

  return (
    <AdminSettingsPageLayout
      title='Notifications'
      current='Notifications'
      description='Customize toast position, accent color, and preview behavior.'
    >
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
        <div className='space-y-6 lg:col-span-2'>
          <NotificationsSettingsForm
            accent={accent}
            accentSelectOptions={accentSelectOptions}
            onPreview={showPreview}
            onSave={handleSave}
            position={position}
            setAccent={setAccent}
            setPosition={setPosition}
          />
        </div>

        <div>
          <NotificationsPreview
            accent={accent}
            accentColor={getAccentColor(accent)}
            position={position}
            preview={positionPreview[position]}
          />
        </div>
      </div>
    </AdminSettingsPageLayout>
  );
}

export default AdminNotificationsSettingsPage;
