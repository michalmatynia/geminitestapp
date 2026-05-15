'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useCallback, useState } from 'react';

import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  FilemakerEmailCampaignCancelRunResponse,
  FilemakerEmailCampaignProcessRunResponse,
} from '../types';
import type { FilemakerCampaignRunActionId } from './AdminFilemakerCampaignEditPage.utils';

type UseFilemakerCampaignRunActionsResult = {
  handleRunAction: (runId: string, action: FilemakerCampaignRunActionId) => Promise<boolean>;
  isRunActionPending: (runId: string, action?: FilemakerCampaignRunActionId) => boolean;
  pendingActionKey: string | null;
};

const getPendingActionKey = (runId: string, action: FilemakerCampaignRunActionId): string =>
  `${runId}:${action}`;

type ProcessRunActionId = Exclude<FilemakerCampaignRunActionId, 'cancel'>;

type CampaignRunActionVariables = {
  action: FilemakerCampaignRunActionId;
  runId: string;
};

type CampaignRunActionResult =
  | {
      action: 'cancel';
      response: FilemakerEmailCampaignCancelRunResponse;
    }
  | {
      action: ProcessRunActionId;
      response: FilemakerEmailCampaignProcessRunResponse;
    };

const getProcessRunReason = (action: FilemakerCampaignRunActionId): 'manual' | 'retry' =>
  action === 'retry' ? 'retry' : 'manual';

const getProcessRunQueuedMessage = (action: FilemakerCampaignRunActionId): string =>
  action === 'retry' ? 'Retry processing queued.' : 'Run processing queued.';

const getProcessRunInlineMessage = (action: FilemakerCampaignRunActionId): string =>
  action === 'retry'
    ? 'Retry processing started in inline mode.'
    : 'Run processing started in inline mode.';

const getProcessRunEmptyMessage = (action: FilemakerCampaignRunActionId): string =>
  action === 'retry'
    ? 'No retryable deliveries were queued.'
    : 'No queued deliveries were available to process.';

const getProcessRunToastMessage = (
  action: FilemakerCampaignRunActionId,
  response: FilemakerEmailCampaignProcessRunResponse
): string => {
  if (response.queuedDeliveryCount <= 0) return getProcessRunEmptyMessage(action);
  if (response.dispatchMode === 'inline') return getProcessRunInlineMessage(action);
  return getProcessRunQueuedMessage(action);
};

const executeCampaignRunAction = async ({
  action,
  runId,
}: CampaignRunActionVariables): Promise<CampaignRunActionResult> => {
  if (action === 'cancel') {
    const response = await api.post<FilemakerEmailCampaignCancelRunResponse>(
      `/api/filemaker/campaigns/runs/${encodeURIComponent(runId)}/cancel`
    );
    return { action, response };
  }

  const response = await api.post<FilemakerEmailCampaignProcessRunResponse>(
    `/api/filemaker/campaigns/runs/${encodeURIComponent(runId)}/process`,
    {
      reason: getProcessRunReason(action),
    }
  );

  return { action, response };
};

const useCampaignRunActionMutation = (): MutationResult<
  CampaignRunActionResult,
  CampaignRunActionVariables
> =>
  createMutationV2({
    mutationKey: ['filemaker', 'campaigns', 'runs', 'action'],
    mutationFn: executeCampaignRunAction,
    meta: {
      source: 'features.filemaker.useFilemakerCampaignRunActions.action',
      operation: 'action',
      resource: 'filemaker.campaign-runs',
      domain: 'filemaker',
      description: 'Runs Filemaker email campaign run actions.',
      errorPresentation: 'toast',
      tags: ['filemaker', 'campaigns', 'runs'],
    },
  });

export const useFilemakerCampaignRunActions = (): UseFilemakerCampaignRunActionsResult => {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const campaignRunActionMutation = useCampaignRunActionMutation();
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const handleRunAction = useCallback(
    async (runId: string, action: FilemakerCampaignRunActionId): Promise<boolean> => {
      const pendingKey = getPendingActionKey(runId, action);
      setPendingActionKey(pendingKey);

      try {
        const result = await campaignRunActionMutation.mutateAsync({ action, runId });
        if (result.action === 'cancel') {
          toast('Run cancelled.', { variant: 'success' });
        } else {
          toast(getProcessRunToastMessage(result.action, result.response), { variant: 'success' });
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
    [campaignRunActionMutation, router, settingsStore, toast]
  );

  const isRunActionPending = useCallback(
    (runId: string, action?: FilemakerCampaignRunActionId): boolean => {
      if (pendingActionKey === null) return false;
      if (action === undefined) return pendingActionKey.startsWith(`${runId}:`);
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
