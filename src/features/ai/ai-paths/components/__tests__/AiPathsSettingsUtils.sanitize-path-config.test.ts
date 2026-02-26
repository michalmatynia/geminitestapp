import { describe, expect, it } from 'vitest';

import {
  buildPersistedRuntimeState,
  sanitizePathConfig,
} from '@/features/ai/ai-paths/components/AiPathsSettingsUtils';
import type { AiNode, Edge, PathConfig, RuntimeState } from '@/shared/contracts/ai-paths';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    type: 'viewer',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    ...patch,
  }) as AiNode;

const buildConfig = (edges: Edge[]): PathConfig =>
  ({
    id: 'path-1',
    version: 1,
    name: 'Path 1',
    description: '',
    trigger: 'manual',
    updatedAt: new Date().toISOString(),
    nodes: [
      buildNode({
        id: 'node-6bb64bd12ced85746705fc69',
        type: 'mapper',
        title: 'Mapper',
        inputs: ['context'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'node-837e17bdcefe87fe18d92cd5',
        type: 'compare',
        title: 'Compare',
        inputs: ['value'],
        outputs: ['valid'],
      }),
    ],
    edges,
  }) as PathConfig;

describe('sanitizePathConfig', () => {
  it('drops dangling edges and rewires compatible edge ports', () => {
    const config = buildConfig([
      {
        id: 'edge-valid',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'node-837e17bdcefe87fe18d92cd5',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-dangling',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'missing-node',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-rewire',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'node-837e17bdcefe87fe18d92cd5',
        fromPort: 'unknown',
        toPort: 'value',
      },
    ]);

    const sanitized = sanitizePathConfig(config);

    expect(sanitized.edges).toHaveLength(2);
    expect(sanitized.edges.find((edge: Edge) => edge.id === 'edge-dangling')).toBeUndefined();
    expect(
      sanitized.edges.find((edge: Edge) => edge.id === 'edge-rewire')
    ).toMatchObject({
      id: 'edge-rewire',
      fromPort: 'value',
      toPort: 'value',
    });
  });

  it('keeps already canonical edges unchanged', () => {
    const config = buildConfig([
      {
        id: 'edge-valid',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'node-837e17bdcefe87fe18d92cd5',
        fromPort: 'value',
        toPort: 'value',
      },
    ]);

    const sanitized = sanitizePathConfig(config);

    expect(sanitized.edges).toHaveLength(1);
    expect(sanitized.edges[0]).toMatchObject(config.edges[0] as Edge);
  });

  it('migrates legacy Trigger data edges through a Fetcher node', () => {
    const config = {
      ...buildConfig([
        {
          id: 'edge-trigger-parser-context',
          from: 'node-trigger-111111111111111111111111',
          to: 'node-parser-111111111111111111111111',
          fromPort: 'context',
          toPort: 'context',
        },
        {
          id: 'edge-trigger-parser-entity',
          from: 'node-trigger-111111111111111111111111',
          to: 'node-parser-111111111111111111111111',
          fromPort: 'entityId',
          toPort: 'entityId',
        },
      ]),
      nodes: [
        buildNode({
          id: 'node-trigger-111111111111111111111111',
          type: 'trigger',
          title: 'Trigger',
          inputs: [],
          outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
        }),
        buildNode({
          id: 'node-parser-111111111111111111111111',
          type: 'parser',
          title: 'Parser',
          inputs: ['context', 'entityId'],
          outputs: ['value'],
        }),
      ],
    } as PathConfig;

    const sanitized = sanitizePathConfig(config);
    const triggerNode = sanitized.nodes.find((node: AiNode) => node.type === 'trigger');
    const parserNode = sanitized.nodes.find((node: AiNode) => node.type === 'parser');
    const fetcherNode = sanitized.nodes.find((node: AiNode) => node.type === 'fetcher');

    expect(triggerNode?.outputs).toEqual(['trigger', 'triggerName']);
    expect(fetcherNode).toBeDefined();
    expect(
      sanitized.edges.some(
        (edge: Edge) =>
          edge.from === triggerNode?.id &&
          edge.to === fetcherNode?.id &&
          edge.fromPort === 'trigger' &&
          edge.toPort === 'trigger'
      )
    ).toBe(true);
    expect(
      sanitized.edges.some(
        (edge: Edge) =>
          edge.from === fetcherNode?.id &&
          edge.to === parserNode?.id &&
          (edge.fromPort === 'context' || edge.sourceHandle === 'context') &&
          (edge.toPort === 'context' || edge.targetHandle === 'context')
      )
    ).toBe(true);
    expect(
      sanitized.edges.some(
        (edge: Edge) =>
          edge.from === fetcherNode?.id &&
          edge.to === parserNode?.id &&
          (edge.fromPort === 'entityId' || edge.sourceHandle === 'entityId') &&
          (edge.toPort === 'entityId' || edge.targetHandle === 'entityId')
      )
    ).toBe(true);
  });

  it('preserves shared object-backed ports when persisting runtime state', () => {
    const sharedValue = {
      color: 'red',
    };
    const runtimeState = {
      inputs: {
        'node-6bb64bd12ced85746705fc69': {
          value: sharedValue,
        },
      },
      outputs: {
        'node-6bb64bd12ced85746705fc69': {
          value: sharedValue,
        },
        'node-837e17bdcefe87fe18d92cd5': {
          value: sharedValue,
        },
      },
    } as unknown as RuntimeState;

    const persisted = buildPersistedRuntimeState(runtimeState, [
      buildNode({ id: 'node-6bb64bd12ced85746705fc69', type: 'mapper', outputs: ['value'] }),
      buildNode({ id: 'node-837e17bdcefe87fe18d92cd5', type: 'compare', outputs: ['value'] }),
    ]);
    const parsed = JSON.parse(persisted) as Record<string, unknown>;
    const inputs = parsed['inputs'] as Record<string, Record<string, unknown>>;
    const outputs = parsed['outputs'] as Record<string, Record<string, unknown>>;

    expect(inputs['node-6bb64bd12ced85746705fc69']?.['value']).toEqual(sharedValue);
    expect(outputs['node-6bb64bd12ced85746705fc69']?.['value']).toEqual(sharedValue);
    expect(outputs['node-837e17bdcefe87fe18d92cd5']?.['value']).toEqual(sharedValue);
  });
});
