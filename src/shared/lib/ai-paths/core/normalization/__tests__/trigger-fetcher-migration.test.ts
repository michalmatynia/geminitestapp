import { describe, expect, it } from 'vitest';

import { migrateTriggerToFetcherGraph } from '@/shared/lib/ai-paths/core/normalization';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    createdAt: '2026-02-23T00:00:00.000Z',
    updatedAt: null,
    type: 'viewer',
    title: 'Node',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: [],
    outputs: [],
    ...patch,
  }) as AiNode;

describe('migrateTriggerToFetcherGraph', () => {
  it('creates a fetcher node and rewires legacy trigger data edges', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
      }),
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['context', 'entityId'],
        outputs: ['value'],
      }),
    ];
    const edges: Edge[] = [
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
    ];

    const migrated = migrateTriggerToFetcherGraph(nodes, edges);

    expect(migrated.changed).toBe(true);
    expect(migrated.createdFetcherNodeIds).toHaveLength(1);
    const fetcherNodeId = migrated.createdFetcherNodeIds[0];
    expect(migrated.nodes.some((node: AiNode) => node.id === fetcherNodeId)).toBe(true);
    expect(
      migrated.edges.some(
        (edge: Edge) =>
          edge.from === 'trigger-1' &&
          edge.to === fetcherNodeId &&
          edge.fromPort === 'trigger' &&
          edge.toPort === 'trigger'
      )
    ).toBe(true);
    expect(
      migrated.edges.some(
        (edge: Edge) =>
          edge.from === fetcherNodeId &&
          edge.to === 'parser-1' &&
          edge.fromPort === 'context' &&
          edge.toPort === 'context'
      )
    ).toBe(true);
    expect(
      migrated.edges.some(
        (edge: Edge) =>
          edge.from === fetcherNodeId &&
          edge.to === 'parser-1' &&
          edge.fromPort === 'entityId' &&
          edge.toPort === 'entityId'
      )
    ).toBe(true);
  });

  it('reuses existing fetcher for rewiring and avoids duplicate trigger->fetcher signal edges', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
      }),
      buildNode({
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
        outputs: ['context', 'meta', 'entityId', 'entityType'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        title: 'Database',
        inputs: ['entityId'],
        outputs: ['result'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher-signal',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-trigger-db-entity',
        from: 'trigger-1',
        to: 'db-1',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
    ];

    const migrated = migrateTriggerToFetcherGraph(nodes, edges);

    expect(migrated.createdFetcherNodeIds).toHaveLength(0);
    expect(
      migrated.edges.filter(
        (edge: Edge) =>
          edge.from === 'trigger-1' &&
          edge.to === 'fetcher-1' &&
          edge.fromPort === 'trigger' &&
          edge.toPort === 'trigger'
      )
    ).toHaveLength(1);
    expect(
      migrated.edges.some(
        (edge: Edge) =>
          edge.id === 'edge-trigger-db-entity' &&
          edge.from === 'fetcher-1' &&
          edge.to === 'db-1' &&
          edge.fromPort === 'entityId' &&
          edge.toPort === 'entityId'
      )
    ).toBe(true);
  });
});

