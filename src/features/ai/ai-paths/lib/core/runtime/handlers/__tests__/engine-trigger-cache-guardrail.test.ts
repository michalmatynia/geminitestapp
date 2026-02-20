import { describe, expect, it, vi } from 'vitest';

import { evaluateGraph } from '@/features/ai/ai-paths/lib/core/runtime/engine';
import type { AiNode } from '@/shared/contracts/ai-paths';

const buildTriggerNode = (): AiNode =>
  ({
    id: 'trigger-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'trigger',
    title: 'Trigger',
    description: '',
    position: { x: 100, y: 120 },
    data: {},
    inputs: ['context'],
    outputs: ['context', 'entityId', 'entityType'],
    config: {
      trigger: {
        event: 'translation_trigger',
      },
    },
  }) as AiNode;

describe('evaluateGraph trigger cache guardrail', () => {
  it('does not cache trigger nodes across runs', async () => {
    const nodes: AiNode[] = [buildTriggerNode()];
    const fetchEntityByType = vi.fn().mockResolvedValue({
      id: 'product-1',
      title: 'Desk Lamp',
    });
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const firstFinish = vi.fn();
    const secondFinish = vi.fn();

    const first = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-translation',
      runId: 'run-1',
      runStartedAt: '2026-01-01T00:00:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'product-1', entityType: 'product' },
      strictFlowMode: true,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      onNodeFinish: firstFinish,
    });

    const second = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-translation',
      runId: 'run-2',
      runStartedAt: '2026-01-01T00:01:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'product-1', entityType: 'product' },
      strictFlowMode: true,
      seedOutputs: first.outputs,
      seedHashes: first.hashes,
      seedHashTimestamps: first.hashTimestamps,
      seedHistory: first.history as any,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      onNodeFinish: secondFinish,
    });

    expect(firstFinish).toHaveBeenCalled();
    expect(secondFinish).toHaveBeenCalled();
    expect(secondFinish.mock.calls[0]?.[0]?.cached).not.toBe(true);
    expect(second.outputs?.['trigger-1']?.['entityId']).toBe('product-1');
    expect(fetchEntityByType).toHaveBeenCalledTimes(2);
  });
});
