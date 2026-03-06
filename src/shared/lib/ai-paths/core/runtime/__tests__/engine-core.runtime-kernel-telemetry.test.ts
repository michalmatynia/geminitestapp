import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (overrides: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-1',
    type: 'custom',
    title: 'Custom Node',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {},
    position: { x: 0, y: 0 },
    ...overrides,
  }) as AiNode;

describe('engine-core runtime-kernel telemetry propagation', () => {
  it('includes runtime-kernel telemetry in executed profile events, history, and onNodeFinish', async () => {
    const node = buildNode();
    const onNodeFinish = vi.fn();
    const profileEvents: Array<Record<string, unknown>> = [];

    const result = await evaluateGraphInternal([node], [] satisfies Edge[], {
      resolveHandler: () => async () => ({ value: 'ok' }),
      resolveHandlerTelemetry: () => ({
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'override',
        runtimeCodeObjectId: 'ai-paths.node-code-object.custom.v3',
      }),
      onNodeFinish,
      recordHistory: true,
      profile: {
        onEvent: (event): void => {
          if (event.type === 'node') {
            profileEvents.push(event as unknown as Record<string, unknown>);
          }
        },
      },
      reportAiPathsError: (): void => {},
    });

    const executedEvent = profileEvents.find((event) => event['status'] === 'executed');
    expect(executedEvent?.['runtimeStrategy']).toBe('code_object_v3');
    expect(executedEvent?.['runtimeResolutionSource']).toBe('override');
    expect(executedEvent?.['runtimeCodeObjectId']).toBe('ai-paths.node-code-object.custom.v3');

    const finishCall = onNodeFinish.mock.calls[0] as [Record<string, unknown>];
    expect(finishCall?.[0]?.['runtimeStrategy']).toBe('code_object_v3');
    expect(finishCall?.[0]?.['runtimeResolutionSource']).toBe('override');
    expect(finishCall?.[0]?.['runtimeCodeObjectId']).toBe('ai-paths.node-code-object.custom.v3');

    const historyEntry = result.history?.[node.id]?.[0];
    expect(historyEntry?.runtimeStrategy).toBe('code_object_v3');
    expect(historyEntry?.runtimeResolutionSource).toBe('override');
    expect(historyEntry?.runtimeCodeObjectId).toBe('ai-paths.node-code-object.custom.v3');
    expect(String(historyEntry?.traceId ?? '')).toContain('run_');
    expect(String(historyEntry?.spanId ?? '')).toContain('node-1:1:1');
    expect(historyEntry?.attempt).toBe(1);
  });

  it('records trace coordinates and edge provenance in runtime history', async () => {
    const sourceNode = buildNode({
      id: 'node-source',
      title: 'Source Node',
    });
    const targetNode = buildNode({
      id: 'node-target',
      title: 'Target Node',
      inputs: ['value'],
      outputs: ['result'],
      inputContracts: {
        value: {
          required: true,
        },
      },
    });

    const result = await evaluateGraphInternal(
      [sourceNode, targetNode],
      [
        {
          id: 'edge-1',
          from: 'node-source',
          fromPort: 'value',
          to: 'node-target',
          toPort: 'value',
        },
      ] satisfies Edge[],
      {
        resolveHandler: (type) =>
          async ({ nodeId, nodeInputs }) =>
            type === 'custom' && nodeId === 'node-target'
              ? { result: nodeInputs['value'] }
              : { value: 'ok' },
        recordHistory: true,
        reportAiPathsError: (): void => {},
      }
    );

    const sourceHistory = result.history?.['node-source']?.[0];
    const targetHistory = result.history?.['node-target']?.at(-1);

    expect(sourceHistory?.spanId).toBe('node-source:1:1');
    expect(sourceHistory?.outputsTo).toEqual([
      expect.objectContaining({
        nodeId: 'node-target',
        fromPort: 'value',
        toPort: 'value',
      }),
    ]);
    expect(targetHistory?.traceId).toContain('run_');
    expect(targetHistory?.spanId).toBe('node-target:1:2');
    expect(targetHistory?.attempt).toBe(1);
    expect(targetHistory?.inputsFrom).toEqual([
      expect.objectContaining({
        nodeId: 'node-source',
        fromPort: 'value',
        toPort: 'value',
      }),
    ]);
  });

  it('includes runtime-kernel telemetry in blocked/missing-input profile events', async () => {
    const blockedNode = buildNode({
      id: 'node-blocked',
      type: 'custom_blocked',
      inputs: ['value'],
      outputs: ['value'],
    });

    const profileEvents: Array<Record<string, unknown>> = [];
    const onNodeBlocked = vi.fn();

    await evaluateGraphInternal([blockedNode], [] satisfies Edge[], {
      resolveHandler: () => async () => ({ value: 'unused' }),
      resolveHandlerTelemetry: () => ({
        runtimeStrategy: 'compatibility',
        runtimeResolutionSource: 'registry',
        runtimeCodeObjectId: null,
      }),
      onNodeBlocked,
      profile: {
        onEvent: (event): void => {
          if (event.type === 'node') {
            profileEvents.push(event as unknown as Record<string, unknown>);
          }
        },
      },
      reportAiPathsError: (): void => {},
    });

    const blockedEvent = profileEvents.find(
      (event) => event['nodeId'] === 'node-blocked' && event['reason'] === 'missing_inputs'
    );
    expect(blockedEvent?.['runtimeStrategy']).toBe('compatibility');
    expect(blockedEvent?.['runtimeResolutionSource']).toBe('registry');
    expect(blockedEvent?.['runtimeCodeObjectId']).toBeNull();

    const blockedCall = onNodeBlocked.mock.calls[0] as [Record<string, unknown>];
    expect(blockedCall?.[0]?.['runtimeStrategy']).toBe('compatibility');
    expect(blockedCall?.[0]?.['runtimeResolutionSource']).toBe('registry');
    expect(blockedCall?.[0]?.['runtimeCodeObjectId']).toBeNull();
  });
});
