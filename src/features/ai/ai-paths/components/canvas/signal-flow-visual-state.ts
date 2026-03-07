// Edge flow should represent data that has reached a node, not nodes that are merely eligible.
const EDGE_FLOWING_RUNTIME_STATUSES = new Set<string>(['running', 'polling', 'processing']);

const EDGE_TERMINAL_RUNTIME_STATUSES = new Set<string>([
  'completed',
  'failed',
  'canceled',
  'cached',
  'blocked',
  'skipped',
  'timeout',
]);

const BLOCKER_PROCESSING_NODE_TYPES = new Set<string>([
  'model',
  'agent',
  'learner_agent',
  'poll',
  'delay',
]);

export const BLOCKER_PROCESSING_STATUSES = new Set<string>([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'processing',
]);

export const normalizeRuntimeStatus = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

export const formatRuntimeStatusLabel = (status: string): string =>
  status === 'waiting_callback'
    ? 'Waiting'
    : status === 'advance_pending'
      ? 'Processing'
      : status
        .split('_')
        .map((part: string): string =>
          part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part
        )
        .join(' ');

export const resolveEdgeRuntimeActive = (status: string | null): boolean => {
  if (!status) return false;
  return EDGE_FLOWING_RUNTIME_STATUSES.has(status) && !EDGE_TERMINAL_RUNTIME_STATUSES.has(status);
};

export const resolveNodeBlockerProcessing = (input: {
  nodeType: string;
  status: string | null;
}): boolean =>
  BLOCKER_PROCESSING_NODE_TYPES.has(input.nodeType) &&
  Boolean(input.status && BLOCKER_PROCESSING_STATUSES.has(input.status));

export const resolveNodeRuntimeStatusLabel = (input: {
  nodeType: string;
  status: string | null;
}): string | null => {
  const status = input.status;
  if (!status) return null;
  if (status === 'waiting_callback' && resolveNodeBlockerProcessing(input)) {
    return 'Processing';
  }
  return formatRuntimeStatusLabel(status);
};
