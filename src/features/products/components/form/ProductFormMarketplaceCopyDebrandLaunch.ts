'use client';

import { queueMarketplaceCopyDebrandRun } from '@/features/products/api/products';
import type { MarketplaceCopyDebrandTriggerInput } from '@/shared/contracts/products';
import type { Toast } from '@/shared/ui/toast';

import {
  type DebrandRunStatus,
  notifyMarketplaceCopyDebrandRunQueued,
  persistMarketplaceCopyDebrandRunFeedback,
} from './ProductFormMarketplaceCopyDebrandFeedback';

export type DebrandPayloadFactory = {
  productId: string | null;
  getEntityJson: () => Record<string, unknown>;
  getMarketplaceCopyDebrandInput: () => MarketplaceCopyDebrandTriggerInput;
};

const resolveDebrandLaunchErrorMessage = (message: string): string => {
  const explicitMessage = message.trim();
  if (explicitMessage.length === 0) return 'Debrand failed: unable to start the AI Path run.';
  return explicitMessage.startsWith('Debrand failed:')
    ? explicitMessage
    : `Debrand failed: ${explicitMessage}`;
};

const getLaunchErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : String(error);

export const launchMarketplaceCopyDebrandRun = async (input: {
  payload: DebrandPayloadFactory;
  integrationIds: string[];
  toast: Toast;
  setError: (value: string | null) => void;
  setRunStatus: (status: DebrandRunStatus) => void;
  setIsTriggerPending: (value: boolean) => void;
  setPendingRunId: (value: string) => void;
}): Promise<void> => {
  input.setError(null);
  input.setRunStatus('waiting');
  input.setIsTriggerPending(true);
  try {
    const response = await queueMarketplaceCopyDebrandRun({
      productId: input.payload.productId,
      entityJson: input.payload.getEntityJson(),
      marketplaceCopyDebrandInput: input.payload.getMarketplaceCopyDebrandInput(),
    });
    const productId = response.productId ?? input.payload.productId;
    const updatedAt = new Date().toISOString();
    input.setRunStatus('queued');
    input.setPendingRunId(response.runId);
    persistMarketplaceCopyDebrandRunFeedback({
      productId,
      integrationIds: input.integrationIds,
      run: {
        runId: response.runId,
        status: 'queued',
        updatedAt,
        finishedAt: null,
        errorMessage: null,
      },
    });
    notifyMarketplaceCopyDebrandRunQueued({ runId: response.runId, productId });
    input.toast(`Debrand job queued (${response.runId}).`, { variant: 'success' });
  } catch (launchError) {
    const message = resolveDebrandLaunchErrorMessage(getLaunchErrorMessage(launchError));
    input.setRunStatus('failed');
    input.setError(message);
    input.toast(message, { variant: 'error' });
  } finally {
    input.setIsTriggerPending(false);
  }
};
