import type { RuntimeTraceResumeDecision, RuntimeTraceResumeMode } from '@/shared/contracts/ai-paths-runtime';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

export type RunHistoryActionSource = {
  status?: string | null;
  resumeMode?: RuntimeTraceResumeMode | null;
  resumeDecision?: RuntimeTraceResumeDecision | null;
};

export type RunHistoryEntryActionKind = 'replay_run';

export type RunHistoryEntryAction = {
  kind: RunHistoryEntryActionKind;
  label: string;
  title: string;
  description: string;
  resumeMode: 'resume' | 'replay' | null;
};

const RUN_HISTORY_ACTION: RunHistoryEntryAction = {
  kind: 'replay_run',
  label: 'Replay run',
  title: 'Replay this run from the recorded inputs captured in this history entry.',
  description: 'Forward-only mode replays the full run from recorded inputs.',
  resumeMode: 'replay',
};

export const resolveRunHistoryAction = (_input: RunHistoryActionSource): RunHistoryEntryAction =>
  RUN_HISTORY_ACTION;

export const resolveRunHistoryEntryAction = (
  entry: RuntimeHistoryEntry
): RunHistoryEntryAction =>
  resolveRunHistoryAction({
    status: entry.status,
    resumeMode: entry.resumeMode ?? null,
    resumeDecision: entry.resumeDecision ?? null,
  });

export const runHistoryEntryActionTitle = (
  entry: RuntimeHistoryEntry,
  hasAction: boolean
): string => {
  if (!hasAction) return 'Run actions are not available in this context.';
  return resolveRunHistoryEntryAction(entry).title;
};
