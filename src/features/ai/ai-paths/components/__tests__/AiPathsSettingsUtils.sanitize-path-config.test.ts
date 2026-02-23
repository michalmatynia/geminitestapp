import { describe, expect, it } from 'vitest';

import { sanitizePathConfig } from '@/features/ai/ai-paths/components/AiPathsSettingsUtils';
import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

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
        id: 'mapper-1',
        type: 'mapper',
        title: 'Mapper',
        inputs: ['context'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'compare-1',
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
        from: 'mapper-1',
        to: 'compare-1',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-dangling',
        from: 'mapper-1',
        to: 'missing-node',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-rewire',
        from: 'mapper-1',
        to: 'compare-1',
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
        from: 'mapper-1',
        to: 'compare-1',
        fromPort: 'value',
        toPort: 'value',
      },
    ]);

    const sanitized = sanitizePathConfig(config);

    expect(sanitized.edges).toEqual(config.edges);
  });

  it('migrates legacy Trigger data edges through a Fetcher node', () => {
    const config = {
      ...buildConfig([
        {
          id: 'edge-trigger-parser-context',
          from: 'trigger-1',
          to: 'parser-1',
          fromPort: 'context',
          toPort: 'context',
        },
        {
          id: 'edge-trigger-parser-entity',
          from: 'trigger-1',
          to: 'parser-1',
          fromPort: 'entityId',
          toPort: 'entityId',
        },
      ]),
      nodes: [
        buildNode({
          id: 'trigger-1',
          type: 'trigger',
          title: 'Trigger',
          inputs: [],
          outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
        }),
        buildNode({
          id: 'parser-1',
          type: 'parser',
          title: 'Parser',
          inputs: ['context', 'entityId'],
          outputs: ['value'],
        }),
      ],
    } as PathConfig;

    const sanitized = sanitizePathConfig(config);
    const triggerNode = sanitized.nodes.find((node: AiNode) => node.id === 'trigger-1');
    const fetcherNode = sanitized.nodes.find((node: AiNode) => node.type === 'fetcher');

    expect(triggerNode?.outputs).toEqual(['trigger', 'triggerName']);
    expect(fetcherNode).toBeDefined();
    expect(
      sanitized.edges.some(
        (edge: Edge) =>
          edge.from === 'trigger-1' &&
          edge.to === fetcherNode?.id &&
          edge.fromPort === 'trigger' &&
          edge.toPort === 'trigger'
      )
    ).toBe(true);
    expect(
      sanitized.edges.some(
        (edge: Edge) =>
          edge.from === fetcherNode?.id &&
          edge.to === 'parser-1' &&
          edge.fromPort === 'context' &&
          edge.toPort === 'context'
      )
    ).toBe(true);
    expect(
      sanitized.edges.some(
        (edge: Edge) =>
          edge.from === fetcherNode?.id &&
          edge.to === 'parser-1' &&
          edge.fromPort === 'entityId' &&
          edge.toPort === 'entityId'
      )
    ).toBe(true);
  });
});
