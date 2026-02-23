import { describe, expect, it, vi } from 'vitest';

import { evaluateGraph } from '@/features/ai/ai-paths/lib/core/runtime/engine';
import type { AiNode } from '@/shared/contracts/ai-paths';
import type { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

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
    inputs: [],
    outputs: ['trigger', 'triggerName'],
    config: {
      trigger: {
        event: 'translation_trigger',
      },
    },
  }) as AiNode;

const buildPromptNode = (): AiNode =>
  ({
    id: 'prompt-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'prompt',
    title: 'Prompt',
    description: '',
    position: { x: 220, y: 120 },
    data: {},
    inputs: [],
    outputs: ['prompt'],
    config: {
      prompt: {
        template: '',
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
    expect(second.outputs?.['trigger-1']?.['trigger']).toBe(true);
    expect(fetchEntityByType).toHaveBeenCalledTimes(2);
  });

  it('recomputes prompt node when cached output has no declared output payload', async () => {
    const nodes: AiNode[] = [buildPromptNode()];
    const fetchEntityByType = vi.fn().mockResolvedValue(null);
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const first = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-prompt',
      runId: 'run-prompt-1',
      runStartedAt: '2026-01-01T00:00:00.000Z',
      strictFlowMode: true,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });

    const initialPrompt = String(first.outputs?.['prompt-1']?.['prompt'] ?? '');
    expect(initialPrompt.length).toBeGreaterThan(0);

    const secondFinish = vi.fn();
    const second = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-prompt',
      runId: 'run-prompt-2',
      runStartedAt: '2026-01-01T00:01:00.000Z',
      strictFlowMode: true,
      seedOutputs: {
        ...(first.outputs ?? {}),
        'prompt-1': { status: 'completed' } as RuntimePortValues,
      },
      seedHashes: first.hashes,
      seedHashTimestamps: first.hashTimestamps,
      seedHistory: first.history,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      onNodeFinish: secondFinish,
    });

    expect(secondFinish).toHaveBeenCalled();
    expect(secondFinish.mock.calls[0]?.[0]?.cached).not.toBe(true);
    expect(second.outputs?.['prompt-1']?.['prompt']).toBe(initialPrompt);
  });

  it('does not run-fence skip prompt node when prior same-run output has only status', async () => {
    const nodes: AiNode[] = [buildPromptNode()];
    const fetchEntityByType = vi.fn().mockResolvedValue(null);
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const first = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-prompt',
      runId: 'run-prompt-fence',
      runStartedAt: '2026-01-01T00:02:00.000Z',
      strictFlowMode: true,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });

    const secondFinish = vi.fn();
    const second = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-prompt',
      runId: 'run-prompt-fence',
      runStartedAt: '2026-01-01T00:02:00.000Z',
      strictFlowMode: true,
      seedOutputs: {
        ...(first.outputs ?? {}),
        'prompt-1': { status: 'completed' } as RuntimePortValues,
      },
      seedHashes: first.hashes,
      seedHashTimestamps: first.hashTimestamps,
      seedHistory: first.history,
      seedRunId: first.runId,
      seedRunStartedAt: first.runStartedAt,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      onNodeFinish: secondFinish,
    });

    expect(secondFinish).toHaveBeenCalled();
    expect(secondFinish.mock.calls[0]?.[0]?.cached).not.toBe(true);
    expect(typeof second.outputs?.['prompt-1']?.['prompt']).toBe('string');
  });
});
