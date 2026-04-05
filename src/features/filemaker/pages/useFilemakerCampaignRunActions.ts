'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  FilemakerEmailCampaignCancelRunResponse,
  FilemakerEmailCampaignProcessRunResponse,
} from '../types';
import type { FilemakerCampaignRunActionId } from './AdminFilemakerCampaignEditPage.utils';

const getPendingActionKey = (runId: string, action: FilemakerCampaignRunActionId): string =>
  `${runId}:${action}`;

export const useFilemakerCampaignRunActions = () => {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const handleRunAction = useCallback(
    async (runId: string, action: FilemakerCampaignRunActionId): Promise<boolean> => {
      const pendingKey = getPendingActionKey(runId, action);
      setPendingActionKey(pendingKey);

      try {
        if (action === 'cancel') {
          await api.post<FilemakerEmailCampaignCancelRunResponse>(
            `/api/filemaker/campaigns/runs/${encodeURIComponent(runId)}/cancel`
          );
          toast('Run cancelled.', { variant: 'success' });
        } else {
          const response = await api.post<FilemakerEmailCampaignProcessRunResponse>(
            `/api/filemaker/campaigns/runs/${encodeURIComponent(runId)}/process`,
            {
              reason: action === 'retry' ? 'retry' : 'manual',
            }
          );

          if (action === 'retry') {
            toast(
              response.queuedDeliveryCount > 0
                ? response.dispatchMode === 'inline'
                  ? 'Retry processing started in inline mode.'
                  : 'Retry processing queued.'
                : 'No retryable deliveries were queued.',
              { variant: 'success' }
            );
          } else {
            toast(
              response.queuedDeliveryCount > 0
                ? response.dispatchMode === 'inline'
                  ? 'Run processing started in inline mode.'
                  : 'Run processing queued.'
                : 'No queued deliveries were available to process.',
              { variant: 'success' }
            );
          }
        }

        settingsStore.refetch();
        router.refresh();
        return true;
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Run action failed.', {
          variant: 'error',
        });
        return false;
      } finally {
        setPendingActionKey((current) => (current === pendingKey ? null : current));
      }
    },
    [router, settingsStore, toast]
  );

  const isRunActionPending = useCallback(
    (runId: string, action?: FilemakerCampaignRunActionId): boolean => {
      if (!pendingActionKey) return false;
      if (!action) return pendingActionKey.startsWith(`${runId}:`);
      return pendingActionKey === getPendingActionKey(runId, action);
    },
    [pendingActionKey]
  );

  return {
    handleRunAction,
    isRunActionPending,
    pendingActionKey,
  };
};
