import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphServer as evaluateGraph } from '@/features/ai/ai-paths/lib/core/runtime/engine-server';
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

const buildFetcherNode = (scope: 'run' | 'activation' | 'session' = 'run'): AiNode =>
  ({
    id: 'fetcher-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'fetcher',
    title: 'Fetcher',
    description: '',
    position: { x: 220, y: 120 },
    data: {},
    inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
    outputs: ['context', 'meta', 'entityId', 'entityType'],
    config: {
      fetcher: {
        sourceMode: 'live_context',
        entityType: 'product',
        entityId: '',
        productId: '',
      },
      runtime: {
        cache: {
          mode: 'auto',
          scope,
        },
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
      seedRunId: (first.runId as string | undefined),
      seedRunStartedAt: (first.runStartedAt as string | undefined),
      fetchEntityByType,
      reportAiPathsError,
      toast,
      onNodeFinish: secondFinish,
    });

    expect(secondFinish).toHaveBeenCalled();
    expect(secondFinish.mock.calls[0]?.[0]?.cached).not.toBe(true);
    expect(typeof second.outputs?.['prompt-1']?.['prompt']).toBe('string');
  });

  it('does not execute disconnected prompt nodes during trigger-scoped runs', async () => {
    const nodes: AiNode[] = [buildTriggerNode(), buildPromptNode()];
    const fetchEntityByType = vi.fn().mockResolvedValue(null);
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const onNodeFinish = vi.fn();

    const result = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-trigger-only',
      runId: 'run-trigger-only',
      runStartedAt: '2026-01-01T00:03:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'product-1', entityType: 'product' },
      strictFlowMode: true,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      onNodeFinish,
    });

    const finishedNodeIds = onNodeFinish.mock.calls
      .map((call) => call[0]?.node.id)
      .filter((nodeId): nodeId is string => typeof nodeId === 'string');
    expect(finishedNodeIds.length).toBeGreaterThan(0);
    expect(finishedNodeIds.every((nodeId) => nodeId === 'trigger-1')).toBe(true);
    expect(finishedNodeIds).not.toContain('prompt-1');
    expect(result.outputs?.['prompt-1']).toBeUndefined();
  });

  it('drops stale outputs for nodes disconnected from the active trigger branch', async () => {
    const nodes: AiNode[] = [buildTriggerNode(), buildPromptNode()];
    const fetchEntityByType = vi.fn().mockResolvedValue(null);
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = await evaluateGraph({
      nodes,
      edges: [],
      activePathId: 'path-stale-prune',
      runId: 'run-stale-prune',
      runStartedAt: '2026-01-01T00:04:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'product-1', entityType: 'product' },
      strictFlowMode: true,
      seedOutputs: {
        'prompt-1': {
          prompt: 'stale prompt',
          status: 'completed',
        } as RuntimePortValues,
      },
      seedHashes: {
        'prompt-1': 'stale-hash',
      },
      seedHashTimestamps: {
        'prompt-1': 1700000000000,
      },
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });

    expect(result.outputs?.['prompt-1']).toBeUndefined();
    expect(result.hashes?.['prompt-1']).toBeUndefined();
    expect(result.hashTimestamps?.['prompt-1']).toBeUndefined();
  });

  it('does not reuse stale fetcher output across runs when entity context changes', async () => {
    const nodes: AiNode[] = [buildTriggerNode(), buildFetcherNode('run')];
    const edges = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];
    const fetchEntityByType = vi
      .fn()
      .mockImplementation(async (_entityType: string, entityId: string) => ({
        id: entityId,
        title: `Entity ${entityId}`,
      }));
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const first = await evaluateGraph({
      nodes,
      edges,
      activePathId: 'path-fetcher',
      runId: 'run-fetcher-1',
      runStartedAt: '2026-01-01T00:10:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'entity-a', entityType: 'product' },
      strictFlowMode: true,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });

    expect(first.outputs?.['fetcher-1']?.['entityId']).toBe('entity-a');

    const secondFinish = vi.fn();
    const second = await evaluateGraph({
      nodes,
      edges,
      activePathId: 'path-fetcher',
      runId: 'run-fetcher-2',
      runStartedAt: '2026-01-01T00:11:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'entity-b', entityType: 'product' },
      strictFlowMode: true,
      seedOutputs: first.outputs,
      seedHashes: first.hashes,
      seedHashTimestamps: first.hashTimestamps,
      seedHistory: first.history,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      onNodeFinish: secondFinish,
    });

    expect(second.outputs?.['fetcher-1']?.['entityId']).toBe('entity-b');
    const fetcherFinishCall = secondFinish.mock.calls.find(
      (call) => call[0]?.node?.id === 'fetcher-1'
    );
    expect(fetcherFinishCall?.[0]?.cached).not.toBe(true);
  });

  it('blocks session-scope fetcher cache reuse when entity context mismatches', async () => {
    const nodes: AiNode[] = [buildTriggerNode(), buildFetcherNode('session')];
    const edges = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];
    const fetchEntityByType = vi
      .fn()
      .mockImplementation(async (_entityType: string, entityId: string) => ({
        id: entityId,
        title: `Entity ${entityId}`,
      }));
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const first = await evaluateGraph({
      nodes,
      edges,
      activePathId: 'path-fetcher',
      runId: 'run-fetcher-session-1',
      runStartedAt: '2026-01-01T00:12:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'entity-a', entityType: 'product' },
      strictFlowMode: true,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });

    const second = await evaluateGraph({
      nodes,
      edges,
      activePathId: 'path-fetcher',
      runId: 'run-fetcher-session-2',
      runStartedAt: '2026-01-01T00:13:00.000Z',
      triggerNodeId: 'trigger-1',
      triggerEvent: 'translation_trigger',
      triggerContext: { entityId: 'entity-b', entityType: 'product' },
      strictFlowMode: true,
      seedOutputs: {
        ...(first.outputs ?? {}),
        'fetcher-1': {
          ...(first.outputs?.['fetcher-1'] ?? {}),
          entityId: 'entity-a',
          entityType: 'product',
        },
      },
      seedHashes: first.hashes,
      seedHashTimestamps: first.hashTimestamps,
      seedHistory: first.history,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });

    expect(second.outputs?.['fetcher-1']?.['entityId']).toBe('entity-b');
  });
});
