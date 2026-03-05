import { describe, expect, it } from 'vitest';

import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNodes = (): AiNode[] => [
  {
    id: 'node-constant',
    type: 'constant',
    title: 'Constant',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      constant: {
        valueType: 'string',
        value: 'hello',
      },
    },
    position: { x: 0, y: 0 },
  },
  {
    id: 'node-delay',
    type: 'delay',
    title: 'Delay',
    description: '',
    inputs: ['value'],
    outputs: ['value'],
    config: {
      delay: {
        ms: 0,
      },
    },
    position: { x: 140, y: 0 },
  },
];

describe('engine-core edge sanitization', () => {
  it('forwards data when edges are provided in from/to format', async () => {
    const nodes = buildNodes();
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-constant',
        to: 'node-delay',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraphClient({
      nodes,
      edges,
      reportAiPathsError: (): void => {},
    });

    expect(result.status).toBe('completed');
    expect(result.outputs?.['node-constant']?.['value']).toBe('hello');
    expect(result.outputs?.['node-delay']?.['value']).toBe('hello');
  });

  it('does not wire data when edges use deprecated source/target format', async () => {
    const nodes = buildNodes();
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-constant',
        target: 'node-delay',
        sourceHandle: 'value',
        targetHandle: 'value',
      },
    ];

    const result = await evaluateGraphClient({
      nodes,
      edges,
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-delay']?.['value']).not.toBe('hello');
  });

  it('emits runtime-kernel strategy telemetry in profile node events', async () => {
    const nodes = buildNodes();
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-constant',
        to: 'node-delay',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const profileEvents: Array<Record<string, unknown>> = [];
    await evaluateGraphClient({
      nodes,
      edges,
      reportAiPathsError: (): void => {},
      profile: {
        onEvent: (event): void => {
          if (event.type === 'node' && event.status === 'executed') {
            profileEvents.push(event as unknown as Record<string, unknown>);
          }
        },
      },
    });

    const constantEvent = profileEvents.find((event) => event['nodeId'] === 'node-constant');
    const delayEvent = profileEvents.find((event) => event['nodeId'] === 'node-delay');

    expect(constantEvent?.['runtimeStrategy']).toBe('code_object_v3');
    expect(constantEvent?.['runtimeResolutionSource']).toBe('registry');
    expect(constantEvent?.['runtimeCodeObjectId']).toBe('ai-paths.node-code-object.constant.v3');

    expect(delayEvent?.['runtimeStrategy']).toBe('legacy_adapter');
    expect(delayEvent?.['runtimeResolutionSource']).toBe('registry');
    expect(delayEvent?.['runtimeCodeObjectId']).toBeNull();
  });

  it('supports runtimeKernelMode=legacy_only to force pilot nodes onto legacy strategy', async () => {
    const nodes = buildNodes();
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-constant',
        to: 'node-delay',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const profileEvents: Array<Record<string, unknown>> = [];
    await evaluateGraphClient({
      nodes,
      edges,
      runtimeKernelMode: 'legacy_only',
      reportAiPathsError: (): void => {},
      profile: {
        onEvent: (event): void => {
          if (event.type === 'node' && event.status === 'executed') {
            profileEvents.push(event as unknown as Record<string, unknown>);
          }
        },
      },
    });

    const constantEvent = profileEvents.find((event) => event['nodeId'] === 'node-constant');
    expect(constantEvent?.['runtimeStrategy']).toBe('legacy_adapter');
    expect(constantEvent?.['runtimeCodeObjectId']).toBeNull();
  });
});
