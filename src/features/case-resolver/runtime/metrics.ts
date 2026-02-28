import { logCaseResolverWorkspaceEvent } from '../workspace-persistence';

type CounterMetricName = 'selector_recompute_count' | 'context_state_transition_count';

type DurationMetricName =
  | 'tree_scope_resolve_ms'
  | 'case_search_filter_ms'
  | 'editor_dirty_eval_ms';

type CounterState = {
  pending: number;
  lastFlushedAtMs: number;
};

const counterStateByMetric = new Map<CounterMetricName, CounterState>();
const COUNTER_FLUSH_INTERVAL_MS = 1_000;

const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export const incrementCaseResolverCounterMetric = (
  metric: CounterMetricName,
  options?: {
    count?: number;
    source?: string;
    forceFlush?: boolean;
  }
): void => {
  const step = Math.max(1, Math.floor(options?.count ?? 1));
  const source = options?.source ?? 'case_view';
  const forceFlush = options?.forceFlush === true;
  const currentTimeMs = nowMs();
  const state = counterStateByMetric.get(metric) ?? {
    pending: 0,
    lastFlushedAtMs: currentTimeMs,
  };
  state.pending += step;
  const shouldFlush =
    forceFlush || currentTimeMs - state.lastFlushedAtMs >= COUNTER_FLUSH_INTERVAL_MS;
  if (!shouldFlush) {
    counterStateByMetric.set(metric, state);
    return;
  }

  const count = state.pending;
  state.pending = 0;
  state.lastFlushedAtMs = currentTimeMs;
  counterStateByMetric.set(metric, state);
  logCaseResolverWorkspaceEvent({
    source,
    action: metric,
    message: `count=${count}`,
  });
};

export const logCaseResolverDurationMetric = (
  metric: DurationMetricName,
  durationMs: number,
  options?: {
    source?: string;
    message?: string;
    minDurationMs?: number;
  }
): void => {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  const minDurationMs = options?.minDurationMs ?? 0;
  if (durationMs < minDurationMs) return;
  logCaseResolverWorkspaceEvent({
    source: options?.source ?? 'case_view',
    action: metric,
    durationMs,
    message: options?.message,
  });
};
