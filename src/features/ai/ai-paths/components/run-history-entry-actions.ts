import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

export type RunHistoryActionSource = {
  status?: string | null;
};

export type RunHistoryEntryActionKind = 'rerun_from_inputs';

export type RunHistoryEntryAction = {
  kind: RunHistoryEntryActionKind;
  label: string;
  title: string;
  description: string;
};

const RUN_HISTORY_ACTION: RunHistoryEntryAction = {
  kind: 'rerun_from_inputs',
  label: 'Run again',
  title: 'Start a fresh run from the recorded inputs captured in this history entry.',
  description: 'Forward-only mode starts a fresh run from recorded inputs.',
};

export const resolveRunHistoryAction = (_input: RunHistoryActionSource): RunHistoryEntryAction =>
  RUN_HISTORY_ACTION;

export const resolveRunHistoryEntryAction = (
  entry: RuntimeHistoryEntry
): RunHistoryEntryAction =>
  resolveRunHistoryAction({
    status: entry.status,
  });

export const runHistoryEntryActionTitle = (
  entry: RuntimeHistoryEntry,
  hasAction: boolean
): string => {
  if (!hasAction) return 'Run actions are not available in this context.';
  return resolveRunHistoryEntryAction(entry).title;
};
