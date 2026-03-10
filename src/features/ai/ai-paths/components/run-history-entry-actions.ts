import type {
  RuntimeTraceResumeDecision,
  RuntimeTraceResumeMode,
} from '@/shared/contracts/ai-paths-runtime';
import type { RuntimeHistoryEntry } from '@/shared/lib/ai-paths';

export type RunHistoryActionSource = {
  status?: string | null;
  resumeMode?: RuntimeTraceResumeMode | null;
  resumeDecision?: RuntimeTraceResumeDecision | null;
};

export type RunHistoryEntryActionKind = 'retry_node' | 'resume_run' | 'replay_run';

export type RunHistoryEntryAction = {
  kind: RunHistoryEntryActionKind;
  label: string;
  title: string;
  description: string;
  resumeMode: 'resume' | 'replay' | null;
};

export const resolveRunHistoryAction = (input: RunHistoryActionSource): RunHistoryEntryAction => {
  const normalizedStatus =
    typeof input.status === 'string' ? input.status.trim().toLowerCase() : null;

  if (input.resumeMode === 'retry' || normalizedStatus === 'failed') {
    return {
      kind: 'retry_node',
      label: 'Retry node',
      title: 'Queue a retry for this node from the selected history entry.',
      description: 'Failed node entry; queues a node-only retry.',
      resumeMode: null,
    };
  }

  if (
    input.resumeMode === 'resume' ||
    input.resumeDecision === 'reused' ||
    input.resumeDecision === 'reexecuted' ||
    normalizedStatus === 'blocked' ||
    normalizedStatus === 'waiting_callback'
  ) {
    return {
      kind: 'resume_run',
      label: 'Resume run',
      title: 'Resume this run using the recorded upstream outputs from this history entry.',
      description: 'Resume metadata present; reuses recorded upstream outputs.',
      resumeMode: 'resume',
    };
  }

  return {
    kind: 'replay_run',
    label: 'Replay run',
    title: 'Replay this run from the recorded inputs captured in this history entry.',
    description: 'No resume metadata; replays the full run from recorded inputs.',
    resumeMode: 'replay',
  };
};

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
