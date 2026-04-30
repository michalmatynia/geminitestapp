'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import { extractDebrandedMarketplaceCopyResultFromAiPathRunDetail } from '@/features/products/lib/extractDebrandedMarketplaceCopyFromAiPathRunDetail';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import {
  subscribeToTrackedAiPathRun,
  type TrackedAiPathRunSnapshot,
} from '@/shared/lib/ai-paths/client-run-tracker';

import {
  clearMarketplaceCopyDebrandRunFeedback,
  type DebrandRunStatus,
  persistMarketplaceCopyDebrandRunFeedback,
} from './ProductFormMarketplaceCopyDebrandFeedback';

const RUN_DETAIL_TIMEOUT_MS = 60_000;

const resolveSnapshotFailureMessage = (snapshot: TrackedAiPathRunSnapshot): string =>
  snapshot.errorMessage !== null && snapshot.errorMessage.trim().length > 0
    ? snapshot.errorMessage
    : `Debrand failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`;

const resolveRunDetailLoadErrorMessage = (snapshot: TrackedAiPathRunSnapshot): string =>
  snapshot.status !== 'completed'
    ? resolveSnapshotFailureMessage(snapshot)
    : 'Debrand failed: unable to load the completed AI Path run details.';

const applyDebrandResultToForm = (input: {
  result: NonNullable<ReturnType<typeof extractDebrandedMarketplaceCopyResultFromAiPathRunDetail>>;
  rowId: string;
  resolveCurrentRowIndex: (rowId: string) => number | null;
  setValue: UseFormSetValue<ProductFormData>;
}): boolean => {
  const currentRowIndex = input.resolveCurrentRowIndex(input.rowId);
  if (currentRowIndex === null) return false;

  if (input.result.title !== null) {
    input.setValue(`marketplaceContentOverrides.${currentRowIndex}.title`, input.result.title, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }
  if (input.result.description !== null) {
    input.setValue(
      `marketplaceContentOverrides.${currentRowIndex}.description`,
      input.result.description,
      { shouldDirty: true, shouldTouch: true, shouldValidate: true }
    );
  }
  return true;
};

const handleRunDetailResponse = (input: {
  data: unknown;
  snapshot: TrackedAiPathRunSnapshot;
  rowId: string;
  resolveCurrentRowIndex: (rowId: string) => number | null;
  setValue: UseFormSetValue<ProductFormData>;
  setError: (value: string | null) => void;
  clearPendingRun: () => void;
  clearCompletedRunFeedback: () => void;
}): void => {
  const result = extractDebrandedMarketplaceCopyResultFromAiPathRunDetail(input.data);
  if (result === null || (result.title === null && result.description === null)) {
    input.setError(resolveRunDetailLoadErrorMessage(input.snapshot));
    input.clearPendingRun();
    return;
  }
  applyDebrandResultToForm({ ...input, result });
  input.setError(null);
  input.clearCompletedRunFeedback();
  input.clearPendingRun();
};

const handleTrackedRunDetail = async (input: {
  trackedRunId: string;
  snapshot: TrackedAiPathRunSnapshot;
  rowId: string;
  resolveCurrentRowIndex: (rowId: string) => number | null;
  setValue: UseFormSetValue<ProductFormData>;
  isActive: () => boolean;
  setError: (value: string | null) => void;
  clearPendingRun: () => void;
  clearCompletedRunFeedback: () => void;
}): Promise<void> => {
  try {
    const response = await getAiPathRun(input.trackedRunId, { timeoutMs: RUN_DETAIL_TIMEOUT_MS });
    if (!input.isActive()) return;
    if (response.ok === false) {
      input.setError(response.error);
      input.clearPendingRun();
      return;
    }
    handleRunDetailResponse({ ...input, data: response.data });
  } catch {
    if (!input.isActive()) return;
    input.setError(resolveRunDetailLoadErrorMessage(input.snapshot));
    input.clearPendingRun();
  }
};

const persistTrackedSnapshot = (input: {
  snapshot: TrackedAiPathRunSnapshot;
  productId: string | null;
  integrationIds: string[];
}): void => {
  persistMarketplaceCopyDebrandRunFeedback({
    productId: input.productId,
    integrationIds: input.integrationIds,
    run: {
      runId: input.snapshot.runId,
      status: input.snapshot.status,
      updatedAt: input.snapshot.updatedAt,
      finishedAt: input.snapshot.finishedAt,
      errorMessage: input.snapshot.errorMessage,
    },
  });
};

type TrackedMarketplaceCopyDebrandRunInput = {
  pendingRunId: string | null;
  productId: string | null;
  integrationIds: string[];
  rowId: string;
  resolveCurrentRowIndex: (rowId: string) => number | null;
  setValue: UseFormSetValue<ProductFormData>;
  setError: (value: string | null) => void;
  setRunStatus: (status: DebrandRunStatus | null) => void;
  setPendingRunId: (updater: (current: string | null) => string | null) => void;
};

const useMarketplaceCopyDebrandRunIdentityRefs = (
  input: Pick<TrackedMarketplaceCopyDebrandRunInput, 'productId' | 'integrationIds'>
): {
  productIdRef: MutableRefObject<string | null>;
  integrationIdsRef: MutableRefObject<string[]>;
} => {
  const productIdRef = useRef(input.productId);
  const integrationIdsRef = useRef(input.integrationIds);
  productIdRef.current = input.productId;
  integrationIdsRef.current = input.integrationIds;
  return { productIdRef, integrationIdsRef };
};

export const useTrackedMarketplaceCopyDebrandRun = (
  input: TrackedMarketplaceCopyDebrandRunInput
): void => {
  const { pendingRunId, rowId, resolveCurrentRowIndex, setValue, setError, setRunStatus, setPendingRunId } = input;
  const { productIdRef, integrationIdsRef } = useMarketplaceCopyDebrandRunIdentityRefs(input);

  useEffect(() => {
    if (pendingRunId === null) return undefined;

    let active = true;
    let terminalHandled = false;
    const trackedRunId = pendingRunId;
    const clearPendingRun = (): void =>
      setPendingRunId((current) => (current === trackedRunId ? null : current));
    const clearCompletedRunFeedback = (): void => {
      clearMarketplaceCopyDebrandRunFeedback({
        productId: productIdRef.current,
        integrationIds: integrationIdsRef.current,
      });
      setRunStatus(null);
    };

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (!active) return;
      setRunStatus(snapshot.status);
      persistTrackedSnapshot({
        productId: productIdRef.current,
        integrationIds: integrationIdsRef.current,
        snapshot,
      });
      if (terminalHandled || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;
      void handleTrackedRunDetail({
        trackedRunId,
        snapshot,
        rowId,
        resolveCurrentRowIndex,
        setValue,
        setError,
        isActive: () => active,
        clearPendingRun,
        clearCompletedRunFeedback,
      });
    });

    return (): void => {
      active = false;
      unsubscribe();
    };
  }, [
    integrationIdsRef,
    pendingRunId,
    productIdRef,
    resolveCurrentRowIndex,
    rowId,
    setError,
    setPendingRunId,
    setRunStatus,
    setValue,
  ]);
};
