import type { useGenericExportToBaseMutation } from '@/features/integrations/product-integrations-adapter';
import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import type { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { QuickExportContext } from './BaseQuickExportButton.types';

type Toast = ReturnType<typeof useToast>['toast'];
type BaseQuickExportMutation = ReturnType<typeof useGenericExportToBaseMutation>;

type BaseQuickExportPayload = {
  productId: string;
  connectionId: string;
  inventoryId: string;
  templateId?: string;
  requestId?: string;
};

type RunBaseQuickExportMutationInput = {
  productId: string;
  context: QuickExportContext;
  quickExportMutation: BaseQuickExportMutation;
  startTrackingExportRun: (
    runId: string,
    initialStatus: TriggerButtonRunFeedbackStatus
  ) => void;
  setTrackedExportStatus: (
    status: TriggerButtonRunFeedbackStatus | null,
    options?: { runId?: string | null; errorMessage?: string | null }
  ) => void;
  prefetchListings: () => void;
  toast: Toast;
};

const buildQuickExportPayload = (
  productId: string,
  context: QuickExportContext
): BaseQuickExportPayload => {
  const payload: BaseQuickExportPayload = {
    productId,
    connectionId: context.connectionId,
    inventoryId: context.inventoryId,
    requestId: `one-click:${productId}:${context.connectionId}:${context.inventoryId}:${Math.floor(Date.now() / 30000)}`,
  };
  if (context.templateId !== '') payload.templateId = context.templateId;
  return payload;
};

const normalizeRunId = (runId: string | null | undefined): string =>
  typeof runId === 'string' ? runId.trim() : '';

const readResponseField = (
  response: Awaited<ReturnType<BaseQuickExportMutation['mutateAsync']>>,
  field: string
): unknown => (response as Record<string, unknown>)[field];

const readResponseString = (
  response: Awaited<ReturnType<BaseQuickExportMutation['mutateAsync']>>,
  field: string
): string | null => {
  const value = readResponseField(response, field);
  return typeof value === 'string' ? value : null;
};

const resolveInitialRunStatus = (
  status: string | null | undefined
): TriggerButtonRunFeedbackStatus =>
  status === 'completed' || status === 'failed' ? status : 'queued';

const resolveSuccessMessage = (status: string | null | undefined): string =>
  status === 'queued' ? 'Base.com export queued.' : 'Base.com export started.';

const applyExportRunFeedback = (
  input: RunBaseQuickExportMutationInput,
  response: Awaited<ReturnType<BaseQuickExportMutation['mutateAsync']>>
): void => {
  const responseStatus = readResponseString(response, 'status');
  const normalizedRunId = normalizeRunId(readResponseString(response, 'runId'));
  const initialRunStatus = resolveInitialRunStatus(responseStatus);
  if (normalizedRunId !== '') {
    input.startTrackingExportRun(normalizedRunId, initialRunStatus);
    return;
  }
  if (responseStatus !== null) {
    input.setTrackedExportStatus(initialRunStatus, { runId: null });
  }
};

export const runBaseQuickExportMutation = async (
  input: RunBaseQuickExportMutationInput
): Promise<void> => {
  try {
    const response = await input.quickExportMutation.mutateAsync(
      buildQuickExportPayload(input.productId, input.context)
    );
    applyExportRunFeedback(input, response);
    input.prefetchListings();
    input.toast(resolveSuccessMessage(readResponseString(response, 'status')), { variant: 'success' });
  } catch (error) {
    logClientError(error);
    const message = error instanceof Error ? error.message : 'Failed to export to Base.com.';
    input.toast(message, { variant: 'error' });
  }
};
