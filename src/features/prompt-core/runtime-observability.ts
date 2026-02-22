import type {
  PromptValidationTimingNameDto as PromptValidationTimingName,
  PromptValidationErrorNameDto as PromptValidationErrorName,
  PromptValidationCounterNameDto as PromptValidationCounterName,
  PromptValidationRuntimeSloTargetsDto as PromptValidationRuntimeSloTargets,
  PromptValidationRuntimeHealthDto as PromptValidationRuntimeHealth,
  PromptValidationObservabilitySnapshotDto as PromptValidationObservabilitySnapshot,
} from '@/shared/contracts/prompt-engine';

type PromptValidationTimingMetric = {
  name: PromptValidationTimingName;
  value: number;
  timestamp: number;
  tags?: Record<string, any> | undefined;
};

type PromptValidationCounterMetric = {
  name: PromptValidationCounterName;
  value: number;
  timestamp: number;
  tags?: Record<string, any> | undefined;
};

const MAX_METRICS = 400;
const MAX_COUNTERS = 800;

const timings: PromptValidationTimingMetric[] = [];
const counters: PromptValidationCounterMetric[] = [];
const errorCounters = new Map<PromptValidationErrorName, number>();

const clampDuration = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const clampCounterValue = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * ratio))
  );
  return sorted[index] ?? 0;
};

const appendTiming = (metric: PromptValidationTimingMetric): void => {
  timings.push(metric);
  if (timings.length > MAX_METRICS) {
    timings.splice(0, timings.length - MAX_METRICS);
  }
};

const appendCounter = (metric: PromptValidationCounterMetric): void => {
  counters.push(metric);
  if (counters.length > MAX_COUNTERS) {
    counters.splice(0, counters.length - MAX_COUNTERS);
  }
};

export const recordPromptValidationTiming = (
  name: PromptValidationTimingName,
  durationMs: number,
  tags?: Record<string, any>
): void => {
  appendTiming({
    name,
    value: clampDuration(durationMs),
    timestamp: Date.now(),
    tags,
  });
};

export const recordPromptValidationCounter = (
  name: PromptValidationCounterName,
  value = 1,
  tags?: Record<string, any>
): void => {
  appendCounter({
    name,
    value: clampCounterValue(value),
    timestamp: Date.now(),
    tags,
  });
};

export const recordPromptValidationError = (
  name: PromptValidationErrorName
): void => {
  errorCounters.set(name, (errorCounters.get(name) ?? 0) + 1);
};

const getCounterValue = (name: PromptValidationCounterName): number =>
  counters
    .filter((metric) => metric.name === name)
    .reduce((acc, metric) => acc + metric.value, 0);

export const PROMPT_VALIDATION_RUNTIME_SLO_TARGETS: PromptValidationRuntimeSloTargets = {
  p95PipelineMs: 120,
  p95ExplodeMs: 100,
  p95CompileMs: 40,
  maxErrorRate: 0.005,
  maxFallbackRate: 0.01,
};

const toRate = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return numerator / denominator;
};

const evaluateRuntimeHealth = (args: {
  timingByName: Map<PromptValidationTimingName, number[]>;
  totalErrors: number;
  selectionTotal: number;
  fallbackTotal: number;
  targets: PromptValidationRuntimeSloTargets;
}): PromptValidationRuntimeHealth => {
  const pipelineValues = args.timingByName.get('runtime_pipeline_ms') ?? [];
  const explodeValues = args.timingByName.get('explode_ms') ?? [];
  const compileValues = args.timingByName.get('runtime_compile_ms') ?? [];
  const pipelineP95 = percentile(pipelineValues, 0.95);
  const explodeP95 = percentile(explodeValues, 0.95);
  const compileP95 = percentile(compileValues, 0.95);
  const errorRate = toRate(args.totalErrors, Math.max(1, args.selectionTotal));
  const fallbackRate = toRate(args.fallbackTotal, Math.max(1, args.selectionTotal));

  const checks = [
    {
      name: 'pipeline_p95',
      ok: pipelineP95 <= args.targets.p95PipelineMs,
      value: pipelineP95,
      target: args.targets.p95PipelineMs,
    },
    {
      name: 'explode_p95',
      ok: explodeP95 <= args.targets.p95ExplodeMs,
      value: explodeP95,
      target: args.targets.p95ExplodeMs,
    },
    {
      name: 'compile_p95',
      ok: compileP95 <= args.targets.p95CompileMs,
      value: compileP95,
      target: args.targets.p95CompileMs,
    },
    {
      name: 'error_rate',
      ok: errorRate <= args.targets.maxErrorRate,
      value: errorRate,
      target: args.targets.maxErrorRate,
    },
    {
      name: 'fallback_rate',
      ok: fallbackRate <= args.targets.maxFallbackRate,
      value: fallbackRate,
      target: args.targets.maxFallbackRate,
    },
  ];

  const failedChecks = checks.filter((check) => !check.ok).length;
  if (failedChecks >= 3) {
    return { status: 'critical', checks };
  }
  if (failedChecks > 0) {
    return { status: 'degraded', checks };
  }
  return { status: 'ok', checks };
};

export const getPromptValidationObservabilitySnapshot = (
  metricName?: PromptValidationTimingName
): PromptValidationObservabilitySnapshot => {
  const grouped = new Map<PromptValidationTimingName, number[]>();
  timings.forEach((metric) => {
    if (metricName && metric.name !== metricName) return;
    const bucket = grouped.get(metric.name) ?? [];
    bucket.push(metric.value);
    grouped.set(metric.name, bucket);
  });

  const metrics = [...grouped.entries()].map(([name, values]) => {
    const sum = values.reduce((acc, value) => acc + value, 0);
    return {
      name,
      count: values.length,
      avgMs: values.length > 0 ? sum / values.length : 0,
      p50Ms: percentile(values, 0.5),
      p95Ms: percentile(values, 0.95),
      maxMs: values.length > 0 ? Math.max(...values) : 0,
    };
  });
  const counterValues: Record<PromptValidationCounterName, number> = {
    runtime_selection_total: getCounterValue('runtime_selection_total'),
    runtime_selection_fallback: getCounterValue('runtime_selection_fallback'),
    runtime_cache_hit: getCounterValue('runtime_cache_hit'),
    runtime_cache_miss: getCounterValue('runtime_cache_miss'),
    runtime_case_resolver_pack_fallback: getCounterValue('runtime_case_resolver_pack_fallback'),
    runtime_fast_path_hit: getCounterValue('runtime_fast_path_hit'),
    runtime_fast_path_miss: getCounterValue('runtime_fast_path_miss'),
    runtime_inflight_dedup_hit: getCounterValue('runtime_inflight_dedup_hit'),
    runtime_inflight_dedup_miss: getCounterValue('runtime_inflight_dedup_miss'),
    runtime_retry: getCounterValue('runtime_retry'),
    runtime_retry_success: getCounterValue('runtime_retry_success'),
    runtime_timeout: getCounterValue('runtime_timeout'),
    runtime_backpressure_drop: getCounterValue('runtime_backpressure_drop'),
    runtime_circuit_break_open: getCounterValue('runtime_circuit_break_open'),
  };
  const errorValues: Record<PromptValidationErrorName, number> = {
    scope_resolution: errorCounters.get('scope_resolution') ?? 0,
    rule_compile: errorCounters.get('rule_compile') ?? 0,
    runtime_execution: errorCounters.get('runtime_execution') ?? 0,
  };
  const totalErrors =
    errorValues.scope_resolution +
    errorValues.rule_compile +
    errorValues.runtime_execution;
  const health = evaluateRuntimeHealth({
    timingByName: grouped,
    totalErrors,
    selectionTotal: counterValues.runtime_selection_total,
    fallbackTotal: counterValues.runtime_selection_fallback,
    targets: PROMPT_VALIDATION_RUNTIME_SLO_TARGETS,
  });

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    counters: counterValues,
    sloTargets: PROMPT_VALIDATION_RUNTIME_SLO_TARGETS,
    health,
    errors: errorValues,
  };
};

export const resetPromptValidationObservability = (): void => {
  timings.splice(0, timings.length);
  counters.splice(0, counters.length);
  errorCounters.clear();
};
