import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/types/domain/ai-paths';

export const PAGE_SIZES = [10, 25, 50];
export const SEARCH_DEBOUNCE_MS = 300;

export type RunDetail = {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
} | null;

export const getLatestEventTimestamp = (events: AiPathRunEventRecord[]): string | null => {
  let max = 0;
  events.forEach((event: AiPathRunEventRecord) => {
    const time = new Date(event.createdAt).getTime();
    if (Number.isFinite(time) && time > max) {
      max = time;
    }
  });
  return max > 0 ? new Date(max).toISOString() : null;
};

export const formatTimestamp = (value?: Date | string | null): string => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export const calculateNodeStatusSummary = (detail: RunDetail): {
  counts: Record<string, number>;
  totalNodes: number;
  completed: number;
  progress: number;
} | null => {
  if (!detail) return null;
  const counts: Record<string, number> = {};
  detail.nodes.forEach((node: AiPathRunNodeRecord) => {
    counts[node.status] = (counts[node.status] ?? 0) + 1;
  });
  const totalNodes = detail.nodes.length;
  const completed = counts['completed'] ?? 0;
  const progress = totalNodes > 0 ? Math.round((completed / totalNodes) * 100) : 0;
  return { counts, totalNodes, completed, progress };
};

export const getHeaderCheckboxState = (
  runsLength: number,
  allVisibleSelected: boolean,
  visibleSelectedCount: number
): boolean | 'indeterminate' => {
  if (runsLength === 0) return false;
  if (allVisibleSelected) return true;
  if (visibleSelectedCount > 0) return 'indeterminate';
  return false;
};

type RequeueResult = {
  requeued: number;
  errors?: Array<{ runId: string; error: string }>;
};

type ToastFn = (message: string, options: { variant: 'success' | 'error' }) => void;

export const showRequeueResultToast = (
  toast: ToastFn,
  requeueMode: 'resume' | 'replay',
  data: RequeueResult
): void => {
  const modeLabel = requeueMode === 'resume' ? 'resume' : 'replay';
  toast(`Requeued ${data.requeued} run(s) (${modeLabel}).`, { variant: 'success' });
  const errorCount = data.errors?.length ?? 0;
  if (errorCount > 0) {
    toast(`${errorCount} run(s) failed to requeue.`, { variant: 'error' });
  }
};
