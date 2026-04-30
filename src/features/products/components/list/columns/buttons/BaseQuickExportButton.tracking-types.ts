import type { Dispatch, SetStateAction } from 'react';

import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';
import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';

export type SetTrackedExportStatusOptions = {
  runId?: string | null;
  errorMessage?: string | null;
};

export type UseBaseQuickExportTrackingInput = {
  productId: string;
  showMarketplaceBadge: boolean;
};

export type TrackedExportRunRefs = {
  getTrackedExportRunId: () => string | null;
  setTrackedExportRunId: (runId: string | null) => void;
  setTrackedExportRunUnsubscribe: (unsubscribe: (() => void) | null) => void;
  stopTrackingExportRun: () => void;
};

export type TrackedExportStatusState = {
  trackedExportRunStatus: TriggerButtonRunFeedbackStatus | null;
  trackedExportRunContextId: string | null;
  trackedExportRunErrorMessage: string | null;
  setTrackedExportRunStatus: Dispatch<SetStateAction<TriggerButtonRunFeedbackStatus | null>>;
  setTrackedExportRunContextId: Dispatch<SetStateAction<string | null>>;
  setTrackedExportRunErrorMessage: Dispatch<SetStateAction<string | null>>;
  setTrackedExportStatus: (
    status: TriggerButtonRunFeedbackStatus | null,
    options?: SetTrackedExportStatusOptions
  ) => void;
};

export type PersistedFeedbackEffectInput = {
  productId: string;
  setTrackedExportRunId: (runId: string | null) => void;
  setTrackedExportRunStatus: Dispatch<SetStateAction<TriggerButtonRunFeedbackStatus | null>>;
  setTrackedExportRunContextId: Dispatch<SetStateAction<string | null>>;
  setTrackedExportRunErrorMessage: Dispatch<SetStateAction<string | null>>;
  startTrackingExportRun: (runId: string, initialStatus: TriggerButtonRunFeedbackStatus) => void;
};

export type ClearAuthoritativeBadgeInput = {
  showMarketplaceBadge: boolean;
  trackedExportRunStatus: TriggerButtonRunFeedbackStatus | null;
  stopTrackingExportRun: () => void;
  setTrackedExportStatus: (
    status: TriggerButtonRunFeedbackStatus | null,
    options?: SetTrackedExportStatusOptions
  ) => void;
};

export type SnapshotHandlerInput = Pick<
  TrackedExportRunRefs,
  'getTrackedExportRunId' | 'stopTrackingExportRun'
> &
  Pick<TrackedExportStatusState, 'setTrackedExportStatus'>;

export type StartTrackingInput = TrackedExportRunRefs &
  Pick<TrackedExportStatusState, 'setTrackedExportStatus'> & {
    productId: string;
    handleTrackedExportRunSnapshot: (runId: string, snapshot: TrackedAiPathRunSnapshot) => void;
  };

export type BaseQuickExportTracking = {
  trackedExportRunStatus: TriggerButtonRunFeedbackStatus | null;
  trackedExportRunContextId: string | null;
  trackedExportRunErrorMessage: string | null;
  startTrackingExportRun: (runId: string, initialStatus: TriggerButtonRunFeedbackStatus) => void;
  setTrackedExportStatus: (
    status: TriggerButtonRunFeedbackStatus | null,
    options?: SetTrackedExportStatusOptions
  ) => void;
};
