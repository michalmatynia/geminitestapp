/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getPromptValidationObservabilitySnapshot,
  recordPromptValidationCounter,
  recordPromptValidationError,
  recordPromptValidationTiming,
  resetPromptValidationObservability,
} from './runtime-observability';

describe('prompt-core runtime observability', () => {
  beforeEach(() => {
    resetPromptValidationObservability();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    resetPromptValidationObservability();
    vi.useRealTimers();
  });

  it('returns an empty healthy snapshot when no metrics have been recorded', () => {
    expect(getPromptValidationObservabilitySnapshot()).toEqual({
      generatedAt: '2026-01-01T00:00:00.000Z',
      metrics: [],
      counters: {
        runtime_selection_total: 0,
        runtime_cache_hit: 0,
        runtime_cache_miss: 0,
        runtime_case_resolver_pack_fallback: 0,
        runtime_fast_path_hit: 0,
        runtime_fast_path_miss: 0,
        runtime_inflight_dedup_hit: 0,
        runtime_inflight_dedup_miss: 0,
        runtime_timeout: 0,
        runtime_backpressure_drop: 0,
        runtime_circuit_break_open: 0,
      },
      sloTargets: expect.objectContaining({
        p95PipelineMs: 120,
        p95ExplodeMs: 100,
        p95CompileMs: 40,
        maxErrorRate: 0.005,
      }),
      health: {
        status: 'ok',
        checks: expect.arrayContaining([
          expect.objectContaining({ name: 'pipeline_p95', ok: true }),
          expect.objectContaining({ name: 'explode_p95', ok: true }),
          expect.objectContaining({ name: 'compile_p95', ok: true }),
          expect.objectContaining({ name: 'error_rate', ok: true }),
        ]),
      },
      errors: {
        scope_resolution: 0,
        rule_compile: 0,
        runtime_execution: 0,
      },
    });
  });

  it('clamps invalid values, filters metrics by name, and reports degraded health', () => {
    recordPromptValidationTiming('runtime_pipeline_ms', -5, { phase: 'negative' });
    recordPromptValidationTiming('runtime_pipeline_ms', 150, { phase: 'slow' });
    recordPromptValidationTiming('explode_ms', 50);
    recordPromptValidationTiming('runtime_compile_ms', 20);
    recordPromptValidationCounter('runtime_selection_total', 10);
    recordPromptValidationCounter('runtime_cache_hit', Number.NaN);
    recordPromptValidationError('runtime_execution');

    const filtered = getPromptValidationObservabilitySnapshot('runtime_pipeline_ms');
    expect(filtered.metrics).toEqual([
      expect.objectContaining({
        name: 'runtime_pipeline_ms',
        count: 2,
        avgMs: 75,
        p50Ms: 0,
        p95Ms: 0,
        maxMs: 150,
      }),
    ]);

    const snapshot = getPromptValidationObservabilitySnapshot();
    expect(snapshot.counters.runtime_selection_total).toBe(10);
    expect(snapshot.counters.runtime_cache_hit).toBe(0);
    expect(snapshot.errors.runtime_execution).toBe(1);
    expect(snapshot.health.status).toBe('degraded');
  });

  it('reports critical health when three or more SLO checks fail', () => {
    recordPromptValidationTiming('runtime_pipeline_ms', 200);
    recordPromptValidationTiming('explode_ms', 150);
    recordPromptValidationTiming('runtime_compile_ms', 60);
    recordPromptValidationCounter('runtime_selection_total', 10);
    recordPromptValidationError('scope_resolution');

    const snapshot = getPromptValidationObservabilitySnapshot();

    expect(snapshot.health.status).toBe('critical');
    expect(snapshot.health.checks.filter((check) => !check.ok)).toHaveLength(4);
  });

  it('caps stored timing and counter history at the configured limits', () => {
    for (let index = 0; index < 401; index += 1) {
      recordPromptValidationTiming('runtime_pipeline_ms', index);
    }

    for (let index = 0; index < 801; index += 1) {
      recordPromptValidationCounter('runtime_selection_total');
    }

    const snapshot = getPromptValidationObservabilitySnapshot();
    const pipelineMetric = snapshot.metrics.find((metric) => metric.name === 'runtime_pipeline_ms');

    expect(pipelineMetric).toEqual(
      expect.objectContaining({
        count: 400,
        p50Ms: 200,
        p95Ms: 380,
      })
    );
    expect(snapshot.counters.runtime_selection_total).toBe(800);
  });
});
