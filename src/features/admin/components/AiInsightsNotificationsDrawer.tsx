'use client';

import { XIcon } from 'lucide-react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  useAiInsightsNotifications,
  useClearAiInsightsNotifications,
} from '@/features/admin/hooks/useAiInsightsNotifications';
import type { AiInsightNotification } from '@/shared/types';
import { Button, StatusBadge, DocumentationSection, LoadingState } from '@/shared/ui';
import { useToast } from '@/shared/ui';

export function AiInsightsNotificationsDrawer(): React.JSX.Element | null {
  const { aiDrawerOpen: open, setAiDrawerOpen } = useAdminLayout();
  const onClose = () => setAiDrawerOpen(false);
  const { toast } = useToast();
  const notificationsQuery = useAiInsightsNotifications({ enabled: open });

  const clearMutation = useClearAiInsightsNotifications();

  const handleClear = async () => {
    try {
      await clearMutation.mutateAsync();
      toast('AI notifications cleared.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to clear notifications.', { variant: 'error' });
    }
  };

  if (!open) return null;

  const notifications = notificationsQuery.data?.notifications ?? [];

  return (
    <div className='fixed inset-0 z-[70]'>
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <div className='absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-gray-950 shadow-xl'>
        <div className='flex items-center justify-between border-b border-border px-4 py-3'>
          <div>
            <div className='text-sm font-semibold text-white'>AI Warnings</div>
            <div className='text-[11px] text-gray-400'>Persistent AI insights outside system logs.</div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void handleClear()}
              disabled={clearMutation.isPending || notifications.length === 0}
              className='h-7 px-2 text-[11px]'
            >
              Clear
            </Button>
            <Button
              variant='ghost'
              size='icon'
              onClick={onClose}
              className='h-7 w-7'
            >
              <XIcon className='size-4' />
            </Button>
          </div>
        </div>
        <div className='h-full overflow-y-auto p-4'>
          {notificationsQuery.isLoading ? (
            <LoadingState message='Fetching AI alerts...' size='sm' className='p-4' />
          ) : notificationsQuery.error ? (
            <div className='text-xs text-red-400'>{notificationsQuery.error.message}</div>
          ) : notifications.length === 0 ? (
            <div className='text-xs text-gray-500'>No AI warnings yet.</div>
          ) : (
            <div className='space-y-3 pb-16'>
              {notifications.map((notification: AiInsightNotification) => (
                <div
                  key={notification.id}
                  className='rounded-md border border-border/60 bg-gray-900/50 p-3 text-xs text-gray-300'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-[10px] uppercase text-gray-500'>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    <StatusBadge
                      status={notification.status}
                      variant={
                        notification.status === 'ok'
                          ? 'success'
                          : notification.status === 'warning'
                            ? 'warning'
                            : 'error'
                      }
                      size='sm'
                      className='font-bold'
                    />
                  </div>
                  <div className='mt-2 text-sm text-white'>{notification.summary}</div>
                  {notification.warnings.length > 0 ? (
                    <DocumentationSection title='Issues' className='mt-3 p-3 bg-amber-500/5 border-amber-500/20'>
                      <ul className='list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
                        {notification.warnings.map((warning: string, index: number) => (
                          <li key={`${notification.id}-warn-${index}`}>{warning}</li>
                        ))}
                      </ul>
                    </DocumentationSection>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
