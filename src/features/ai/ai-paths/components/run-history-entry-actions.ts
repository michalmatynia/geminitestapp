import type {
  RuntimeTraceResumeDecision,
  RuntimeTraceResumeMode,
} from '@/shared/contracts/ai-paths-runtime';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

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

const RESUME_RUN_STATUSES = new Set(['blocked', 'waiting_callback']);
const RESUME_RUN_DECISIONS = new Set<RuntimeTraceResumeDecision>(['reused', 'reexecuted']);
const RUN_HISTORY_ACTIONS: Record<RunHistoryEntryActionKind, RunHistoryEntryAction> = {
  retry_node: {
    kind: 'retry_node',
    label: 'Retry node',
    title: 'Queue a retry for this node from the selected history entry.',
    description: 'Failed node entry; queues a node-only retry.',
    resumeMode: null,
  },
  resume_run: {
    kind: 'resume_run',
    label: 'Resume run',
    title: 'Resume this run using the recorded upstream outputs from this history entry.',
    description: 'Resume metadata present; reuses recorded upstream outputs.',
    resumeMode: 'resume',
  },
  replay_run: {
    kind: 'replay_run',
    label: 'Replay run',
    title: 'Replay this run from the recorded inputs captured in this history entry.',
    description: 'No resume metadata; replays the full run from recorded inputs.',
    resumeMode: 'replay',
  },
};

const normalizeRunHistoryStatus = (status: string | null | undefined): string | null =>
  typeof status === 'string' ? status.trim().toLowerCase() : null;

const hasResumableDecision = (
  resumeDecision: RuntimeTraceResumeDecision | null | undefined
): boolean => Boolean(resumeDecision && RESUME_RUN_DECISIONS.has(resumeDecision));

const hasResumableStatus = (normalizedStatus: string | null): boolean =>
  Boolean(normalizedStatus && RESUME_RUN_STATUSES.has(normalizedStatus));

const shouldRetryRunHistoryEntry = (
  input: RunHistoryActionSource,
  normalizedStatus: string | null
): boolean => [input.resumeMode === 'retry', normalizedStatus === 'failed'].some(Boolean);

const shouldResumeRunHistoryEntry = (
  input: RunHistoryActionSource,
  normalizedStatus: string | null
): boolean =>
  [
    input.resumeMode === 'resume',
    hasResumableDecision(input.resumeDecision),
    hasResumableStatus(normalizedStatus),
  ].some(Boolean);

const resolveRunHistoryActionKind = (
  input: RunHistoryActionSource,
  normalizedStatus: string | null
): RunHistoryEntryActionKind => {
  if (shouldRetryRunHistoryEntry(input, normalizedStatus)) return 'retry_node';
  if (shouldResumeRunHistoryEntry(input, normalizedStatus)) return 'resume_run';
  return 'replay_run';
};

export const resolveRunHistoryAction = (input: RunHistoryActionSource): RunHistoryEntryAction => {
  const normalizedStatus = normalizeRunHistoryStatus(input.status);
  return RUN_HISTORY_ACTIONS[resolveRunHistoryActionKind(input, normalizedStatus)];
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
