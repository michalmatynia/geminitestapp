'use client';

import {
  useAdminLayoutActions,
  useAdminLayoutState,
} from '@/features/admin/context/AdminLayoutContext';
import {
  useAiInsightsNotifications,
  useClearAiInsightsNotifications,
} from '@/features/admin/hooks/useAiInsightsNotifications';
import type { AiInsightNotification } from '@/shared/contracts/ai-insights';
import { Button } from '@/shared/ui/primitives.public';
import { StatusBadge, DocumentationList } from '@/shared/ui/data-display.public';
import { LoadingState, CompactEmptyState, Drawer } from '@/shared/ui/navigation-and-layout.public';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

function NotificationItem({ notification }: { notification: AiInsightNotification }): React.JSX.Element {
  const getVariant = (): 'success' | 'warning' | 'error' => {
    if (notification.status === 'ok') return 'success';
    if (notification.status === 'warning') return 'warning';
    return 'error';
  };

  const formattedDate = (notification.createdAt !== undefined && notification.createdAt !== '')
    ? new Date(notification.createdAt).toLocaleString()
    : 'N/A';

  return (
    <div
      className='rounded-md border border-border/60 bg-gray-900/50 p-3 text-xs text-gray-300'
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[10px] uppercase text-gray-500'>
          {formattedDate}
        </span>
        <StatusBadge
          status={notification.status ?? 'new'}
          variant={getVariant()}
          size='sm'
          className='font-bold'
        />
      </div>
      <div className='mt-2 text-sm text-white'>{notification.summary}</div>
      <DocumentationList
        title='Issues'
        items={notification.warnings ?? []}
        variant='warning'
        size='sm'
      />
    </div>
  );
}

interface ContentProps {
  isLoading: boolean;
  error: Error | null;
  notifications: AiInsightNotification[];
}

function AiInsightsNotificationsContent({ isLoading, error, notifications }: ContentProps): React.JSX.Element {
  if (isLoading) {
    return <LoadingState message='Fetching AI alerts...' size='sm' className='p-4' />;
  }

  if (error !== null) {
    return <div className='text-xs text-red-400'>{error.message}</div>;
  }

  if (notifications.length === 0) {
    return (
      <CompactEmptyState
        title='No AI warnings yet'
        description='Persistent AI insights outside system logs will appear here.'
        className='py-12'
      />
    );
  }

  return (
    <div className='space-y-3 pb-16'>
      {notifications.map((notification: AiInsightNotification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

export function AiInsightsNotificationsDrawer(): React.JSX.Element | null {
  const { aiDrawerOpen: open } = useAdminLayoutState();
  const { setAiDrawerOpen } = useAdminLayoutActions();
  const onClose = (): void => setAiDrawerOpen(false);
  const { toast } = useToast();
  const notificationsQuery = useAiInsightsNotifications({ enabled: open });

  const clearMutation = useClearAiInsightsNotifications();

  const handleClear = async (): Promise<void> => {
    try {
      await clearMutation.mutateAsync();
      toast('AI notifications cleared.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to clear notifications.', {
        variant: 'error',
      });
    }
  };

  const notifications = notificationsQuery.data?.notifications ?? [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title='AI Warnings'
      description='Persistent AI insights outside system logs.'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => { handleClear().catch(logClientError); }}
          disabled={clearMutation.isPending || notifications.length === 0}
          className='h-7 px-2 text-[11px]'
        >
          Clear
        </Button>
      }
    >
      <div className='h-full'>
        <AiInsightsNotificationsContent
          isLoading={notificationsQuery.isLoading}
          error={notificationsQuery.error}
          notifications={notifications}
        />
      </div>
    </Drawer>
  );
}
