import { describe, expect, it } from 'vitest';

import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths';
import {
  assessRuntimeKernelParityRisk,
  buildRuntimeKernelParityMetadata,
  buildRuntimeKernelParityPrompt,
} from '@/features/ai/insights/generator/runtime-analytics-prompt';

const buildSummary = (
  overrides?: Partial<AiPathRuntimeAnalyticsSummary>
): AiPathRuntimeAnalyticsSummary =>
  ({
    from: '2026-03-01T00:00:00.000Z',
    to: '2026-03-02T00:00:00.000Z',
    range: '24h',
    storage: 'redis',
    runs: {
      total: 10,
      queued: 0,
      started: 10,
      completed: 8,
      failed: 2,
      canceled: 0,
      deadLettered: 0,
      successRate: 80,
      failureRate: 20,
      deadLetterRate: 0,
      avgDurationMs: 1200,
      p95DurationMs: 2200,
    },
    nodes: {
      started: 20,
      completed: 18,
      failed: 2,
      queued: 0,
      running: 0,
      polling: 0,
      cached: 1,
      waitingCallback: 0,
    },
    brain: {
      analyticsReports: 0,
      logReports: 0,
      totalReports: 0,
      warningReports: 0,
      errorReports: 0,
    },
    traces: {
      source: 'db_sample',
      sampledRuns: 3,
      sampledSpans: 12,
      completedSpans: 10,
      failedSpans: 2,
      cachedSpans: 1,
      avgDurationMs: 900,
      p95DurationMs: 2100,
      slowestSpan: null,
      topSlowNodes: [],
      topFailedNodes: [],
      kernelParity: {
        sampledRuns: 3,
        runsWithKernelParity: 2,
        sampledHistoryEntries: 5,
        strategyCounts: {
          code_object_v3: 3,
          unknown: 2,
        },
        resolutionSourceCounts: {
          override: 3,
          registry: 2,
          missing: 0,
          unknown: 0,
        },
        codeObjectIds: [
          'ai-paths.node-code-object.constant.v3',
          'ai-paths.node-code-object.template.v3',
        ],
      },
      truncated: false,
    },
    portableEngine: {
      source: 'in_memory',
      totals: {
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        failureRate: 0,
      },
      byRunner: {
        client: { attempts: 0, successes: 0, failures: 0 },
        server: { attempts: 0, successes: 0, failures: 0 },
      },
      bySurface: {
        canvas: { attempts: 0, successes: 0, failures: 0 },
        product: { attempts: 0, successes: 0, failures: 0 },
        api: { attempts: 0, successes: 0, failures: 0 },
      },
      byInputSource: {
        portable_package: { attempts: 0, successes: 0, failures: 0 },
        portable_envelope: { attempts: 0, successes: 0, failures: 0 },
        semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
        path_config: { attempts: 0, successes: 0, failures: 0 },
      },
      failureStageCounts: {
        resolve: 0,
        validation: 0,
        runtime: 0,
      },
      recentFailures: [],
    },
    generatedAt: '2026-03-02T00:00:00.000Z',
    ...overrides,
  }) satisfies AiPathRuntimeAnalyticsSummary;

describe('buildRuntimeKernelParityPrompt', () => {
  it('formats kernel parity coverage, strategy split, and resolution counts', () => {
    const prompt = buildRuntimeKernelParityPrompt(buildSummary());

    expect(prompt).toContain('Sampled runs: 3');
    expect(prompt).toContain('Kernel parity migration risk: HIGH');
    expect(prompt).toContain('Runs with kernel parity telemetry: 2 (66.7%)');
    expect(prompt).toContain(
      'Strategy split: code_object_v3=3 (60.0%), unknown=2 (40.0%)'
    );
    expect(prompt).toContain(
      'Resolution source counts: override=3, registry=2, missing=0, unknown=0'
    );
    expect(prompt).toContain(
      'Top runtime code objects: ai-paths.node-code-object.constant.v3, ai-paths.node-code-object.template.v3'
    );
  });

  it('handles empty kernel parity totals without NaN rates', () => {
    const prompt = buildRuntimeKernelParityPrompt(
      buildSummary({
        traces: {
          ...buildSummary().traces,
          kernelParity: {
            sampledRuns: 0,
            runsWithKernelParity: 0,
            sampledHistoryEntries: 0,
            strategyCounts: {
              code_object_v3: 0,
              unknown: 0,
            },
            resolutionSourceCounts: {
              override: 0,
              registry: 0,
              missing: 0,
              unknown: 0,
            },
            codeObjectIds: [],
          },
        },
      })
    );

    expect(prompt).toContain('Runs with kernel parity telemetry: 0 (0.0%)');
    expect(prompt).toContain(
      'Strategy split: code_object_v3=0 (0.0%), unknown=0 (0.0%)'
    );
    expect(prompt).toContain('Top runtime code objects: none observed in sampled traces');
  });

  it('classifies low risk when parity coverage and v3 share are strong', () => {
    const assessment = assessRuntimeKernelParityRisk(
      buildSummary({
        traces: {
          ...buildSummary().traces,
          kernelParity: {
            sampledRuns: 20,
            runsWithKernelParity: 20,
            sampledHistoryEntries: 100,
            strategyCounts: {
              code_object_v3: 100,
              unknown: 0,
            },
            resolutionSourceCounts: {
              override: 55,
              registry: 45,
              missing: 0,
              unknown: 0,
            },
            codeObjectIds: ['ai-paths.node-code-object.router.v3'],
          },
        },
      })
    );

    expect(assessment.riskLevel).toBe('low');
    expect(assessment.signals).toEqual(['coverage and v3 share are within rollout guardrails']);
  });

  it('builds stable runtime kernel parity metadata payload', () => {
    const summary = buildSummary({
      traces: {
        ...buildSummary().traces,
        kernelParity: {
          sampledRuns: 10,
          runsWithKernelParity: 8,
          sampledHistoryEntries: 20,
          strategyCounts: {
            code_object_v3: 15,
            unknown: 5,
          },
          resolutionSourceCounts: {
            override: 10,
            registry: 8,
            missing: 2,
            unknown: 0,
          },
          codeObjectIds: [],
        },
      },
    });
    const assessment = assessRuntimeKernelParityRisk(summary);
    const metadata = buildRuntimeKernelParityMetadata(summary, assessment);

    expect(metadata).toMatchObject({
      runtimeAnalyticsRange: '24h',
      runtimeKernelParityRiskLevel: 'high',
      runtimeKernelParityCoverageRate: 80,
      runtimeKernelParityV3Rate: 75,
      runtimeKernelParityUnknownRate: 25,
      runtimeKernelParityMissingResolutionRate: 10,
    });
    expect(metadata['runtimeKernelParitySignals']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('kernel parity telemetry coverage'),
        expect.stringContaining('code_object_v3 share'),
        expect.stringContaining('unknown strategy share'),
      ])
    );
  });
});
