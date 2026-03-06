import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  clearAiPathsRuntimeCodeObjectResolvers,
  registerAiPathsRuntimeCodeObjectResolver,
} from '@/shared/lib/ai-paths/core/runtime/code-object-resolver-registry';

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
  beforeEach(() => {
    clearAiPathsRuntimeCodeObjectResolvers();
  });

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

    expect(delayEvent?.['runtimeStrategy']).toBe('code_object_v3');
    expect(delayEvent?.['runtimeResolutionSource']).toBe('registry');
    expect(delayEvent?.['runtimeCodeObjectId']).toBe('ai-paths.node-code-object.delay.v3');
  });

  it('uses a custom code-object resolver when provided in runtime options', async () => {
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

    const customConstantHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'kernel-custom',
    }));
    const resolveCodeObjectHandler = vi.fn(
      ({ nodeType, codeObjectId }: { nodeType: string; codeObjectId: string }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? customConstantHandler
          : null
    );

    const result = await evaluateGraphClient({
      nodes,
      edges,
      reportAiPathsError: (): void => {},
      runtimeKernelPilotNodeTypes: ['constant'],
      resolveCodeObjectHandler,
    });

    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
    expect(customConstantHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('kernel-custom');
    expect(result.outputs?.['node-delay']?.['value']).toBe('kernel-custom');
  });

  it('uses registered runtime code-object resolvers without per-run wiring', async () => {
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

    const registeredConstantHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'kernel-registered',
    }));
    registerAiPathsRuntimeCodeObjectResolver(
      'test.registry.constant',
      ({ nodeType, codeObjectId }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? registeredConstantHandler
          : null
    );

    const result = await evaluateGraphClient({
      nodes,
      edges,
      reportAiPathsError: (): void => {},
      runtimeKernelPilotNodeTypes: ['constant'],
    });

    expect(registeredConstantHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('kernel-registered');
    expect(result.outputs?.['node-delay']?.['value']).toBe('kernel-registered');
  });

  it('applies runtimeKernelCodeObjectResolverIds to scope registered resolvers', async () => {
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

    const ignoredHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'kernel-ignored',
    }));
    registerAiPathsRuntimeCodeObjectResolver('test.registry.ignored', () => ignoredHandler);

    const selectedHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'kernel-selected',
    }));
    registerAiPathsRuntimeCodeObjectResolver(
      'test.registry.selected',
      ({ nodeType, codeObjectId }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? selectedHandler
          : null
    );

    const result = await evaluateGraphClient({
      nodes,
      edges,
      reportAiPathsError: (): void => {},
      runtimeKernelPilotNodeTypes: ['constant'],
      runtimeKernelCodeObjectResolverIds: ['test.registry.selected'],
    });

    expect(ignoredHandler).not.toHaveBeenCalled();
    expect(selectedHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('kernel-selected');
    expect(result.outputs?.['node-delay']?.['value']).toBe('kernel-selected');
  });
});
