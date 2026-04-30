import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';
import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';

import { TERMINAL_EXPORT_RUN_STATUSES } from './BaseQuickExportButton.constants';
import type { PersistedBaseQuickExportFeedback } from './BaseQuickExportButton.types';

export const normalizeTrackingString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized !== '' ? normalized : null;
};

export const shouldResumePersistedRun = (
  feedback: PersistedBaseQuickExportFeedback
): boolean => feedback.runId !== null && TERMINAL_EXPORT_RUN_STATUSES.has(feedback.status) === false;

export const shouldClearStoppedNonTerminalRun = (
  snapshot: TrackedAiPathRunSnapshot
): boolean =>
  snapshot.trackingState === 'stopped' &&
  TERMINAL_EXPORT_RUN_STATUSES.has(snapshot.status) === false;

export const shouldStopTrackingSnapshot = (snapshot: TrackedAiPathRunSnapshot): boolean =>
  snapshot.trackingState === 'stopped' || TERMINAL_EXPORT_RUN_STATUSES.has(snapshot.status);

export const resolveInitialSnapshotStatus = (
  initialStatus: TriggerButtonRunFeedbackStatus
): TriggerButtonRunFeedbackStatus => (initialStatus === 'waiting' ? 'queued' : initialStatus);
