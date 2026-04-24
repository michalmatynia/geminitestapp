import { describe, expect, it } from 'vitest';

import {
  runtimeHistoryEntrySchema,
  runtimeTraceRecordSchema,
} from '@/shared/contracts/ai-paths-runtime';

describe('ai-paths trace record v1 runtime contract', () => {
  it('keeps legacy runtime history entries valid when trace fields are omitted', () => {
    const parsed = runtimeHistoryEntrySchema.safeParse({
      timestamp: new Date().toISOString(),
      pathId: 'path-1',
      pathName: 'Path 1',
      nodeId: 'node-a',
      nodeType: 'prompt',
      nodeTitle: 'Prompt',
      status: 'executed',
      iteration: 1,
      inputs: { bundle: { id: 'product-1' } },
      outputs: { prompt: 'Hello' },
      inputHash: 'hash-1',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts additive trace-backed runtime history fields', () => {
    const parsed = runtimeHistoryEntrySchema.safeParse({
      timestamp: new Date().toISOString(),
      pathId: 'path-1',
      pathName: 'Path 1',
      traceId: 'run-1',
      spanId: 'node-a:2:1',
      nodeId: 'node-a',
      nodeType: 'http',
      nodeTitle: 'HTTP',
      status: 'executed',
      iteration: 1,
      attempt: 2,
      inputs: { url: 'https://example.com' },
      outputs: { status: 200 },
      inputHash: 'hash-2',
      correlationIds: ['corr-1'],
      cacheDecision: 'miss',
      sideEffectPolicy: 'per_activation',
      sideEffectDecision: 'skipped_duplicate',
      effectSourceSpanId: 'node-a:1:1',
      branch: {
        route: 'default',
        fromPort: 'result',
        toPort: 'value',
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      traceId: 'run-1',
      spanId: 'node-a:2:1',
      attempt: 2,
      cacheDecision: 'miss',
      sideEffectDecision: 'skipped_duplicate',
      effectSourceSpanId: 'node-a:1:1',
    });
  });

  it('accepts trace record v1 when traceId matches runId', () => {
    const parsed = runtimeTraceRecordSchema.safeParse({
      version: 'ai-paths.trace.v1',
      traceId: 'run-1',
      runId: 'run-1',
      source: 'server',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      spans: [
        {
          spanId: 'node-a:1:1',
          runId: 'run-1',
          traceId: 'run-1',
          nodeId: 'node-a',
          nodeType: 'prompt',
          nodeTitle: 'Prompt',
          iteration: 1,
          attempt: 1,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          status: 'completed',
          correlationIds: ['corr-1'],
          cache: {
            decision: 'seed',
          },
          effect: {
            policy: 'per_activation',
            decision: 'skipped_duplicate',
            sourceSpanId: 'node-a:1:1',
          },
        },
      ],
      links: [
        {
          correlationId: 'corr-1',
          fromNodeId: 'node-a',
          fromPort: 'prompt',
          toNodeId: 'node-b',
          toPort: 'value',
          valueKind: 'string',
          timestamp: new Date().toISOString(),
        },
      ],
      profile: {
        traceId: 'run-1',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects trace record v1 when traceId and runId diverge', () => {
    const parsed = runtimeTraceRecordSchema.safeParse({
      version: 'ai-paths.trace.v1',
      traceId: 'trace-1',
      runId: 'run-1',
      source: 'server',
      startedAt: new Date().toISOString(),
      spans: [],
    });
    expect(parsed.success).toBe(false);
  });
});
