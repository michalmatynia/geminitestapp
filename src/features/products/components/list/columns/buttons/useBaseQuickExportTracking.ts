'use client';

import {
  useClearTrackedExportOnAuthoritativeBadge,
  usePersistedBaseQuickExportFeedbackEffect,
  useStartTrackingExportRun,
  useStopTrackingOnUnmount,
  useTrackedExportRunRefs,
  useTrackedExportSnapshotHandler,
  useTrackedExportStatusState,
} from './BaseQuickExportButton.tracking-hooks';
import type {
  BaseQuickExportTracking,
  UseBaseQuickExportTrackingInput,
} from './BaseQuickExportButton.tracking-types';

export type { BaseQuickExportTracking } from './BaseQuickExportButton.tracking-types';

export const useBaseQuickExportTracking = ({
  productId,
  showMarketplaceBadge,
}: UseBaseQuickExportTrackingInput): BaseQuickExportTracking => {
  const runRefs = useTrackedExportRunRefs();
  const statusState = useTrackedExportStatusState(productId);
  const handleTrackedExportRunSnapshot = useTrackedExportSnapshotHandler({
    getTrackedExportRunId: runRefs.getTrackedExportRunId,
    stopTrackingExportRun: runRefs.stopTrackingExportRun,
    setTrackedExportStatus: statusState.setTrackedExportStatus,
  });
  const startTrackingExportRun = useStartTrackingExportRun({
    ...runRefs,
    productId,
    setTrackedExportStatus: statusState.setTrackedExportStatus,
    handleTrackedExportRunSnapshot,
  });

  useStopTrackingOnUnmount(runRefs.stopTrackingExportRun);
  usePersistedBaseQuickExportFeedbackEffect({
    productId,
    setTrackedExportRunId: runRefs.setTrackedExportRunId,
    setTrackedExportRunStatus: statusState.setTrackedExportRunStatus,
    setTrackedExportRunContextId: statusState.setTrackedExportRunContextId,
    setTrackedExportRunErrorMessage: statusState.setTrackedExportRunErrorMessage,
    startTrackingExportRun,
  });
  useClearTrackedExportOnAuthoritativeBadge({
    showMarketplaceBadge,
    trackedExportRunStatus: statusState.trackedExportRunStatus,
    stopTrackingExportRun: runRefs.stopTrackingExportRun,
    setTrackedExportStatus: statusState.setTrackedExportStatus,
  });

  return {
    trackedExportRunStatus: statusState.trackedExportRunStatus,
    trackedExportRunContextId: statusState.trackedExportRunContextId,
    trackedExportRunErrorMessage: statusState.trackedExportRunErrorMessage,
    startTrackingExportRun,
    setTrackedExportStatus: statusState.setTrackedExportStatus,
  };
};
