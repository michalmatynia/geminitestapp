import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths';

import { collectInvalidPathSavePayloadIssues } from '../useAiPathsPersistence.helpers';
import { pruneSingleCardinalityIncomingEdges } from '../edge-cardinality-repair';

describe('collectInvalidPathSavePayloadIssues', () => {
  it('returns no issues for canonical graph payloads', () => {
    const config = createDefaultPathConfig('path_save_payload_guard_ok');
    const issues = collectInvalidPathSavePayloadIssues(config.nodes, config.edges);
    expect(issues).toEqual([]);
  });

  it('reports invalid node payload details', () => {
    const config = createDefaultPathConfig('path_save_payload_guard_invalid');
    const [firstNode, ...restNodes] = config.nodes;
    expect(firstNode).toBeDefined();
    const brokenNode = {
      ...(firstNode as AiNode),
      createdAt: undefined,
    } as unknown as AiNode;

    const issues = collectInvalidPathSavePayloadIssues([brokenNode, ...restNodes], config.edges);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'nodes.0.createdAt',
        }),
      ])
    );
  });
});

describe('pruneSingleCardinalityIncomingEdges', () => {
  const buildNode = (patch: Partial<AiNode>): AiNode =>
    ({
      id: patch.id ?? 'node',
      type: patch.type ?? 'template',
      title: patch.title ?? 'Node',
      description: '',
      inputs: patch.inputs ?? [],
      outputs: patch.outputs ?? [],
      position: patch.position ?? { x: 100, y: 100 },
      data: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
      ...patch,
    }) as AiNode;

  it('keeps only the latest incoming edge for single-cardinality ports', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'source-a',
        outputs: ['result'],
      }),
      buildNode({
        id: 'source-b',
        outputs: ['result'],
      }),
      buildNode({
        id: 'fetcher-target',
        type: 'fetcher',
        inputs: ['trigger'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-first',
        from: 'source-a',
        fromPort: 'result',
        to: 'fetcher-target',
        toPort: 'trigger',
      },
      {
        id: 'edge-second',
        from: 'source-b',
        fromPort: 'result',
        to: 'fetcher-target',
        toPort: 'trigger',
      },
    ];

    const repaired = pruneSingleCardinalityIncomingEdges(nodes, edges);

    expect(repaired.edges).toHaveLength(1);
    expect(repaired.edges[0]?.id).toBe('edge-second');
    expect(repaired.removedEdges.map((edge: Edge) => edge.id)).toEqual(['edge-first']);
  });

  it('keeps fan-in wiring for multi-cardinality inputs', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'source-a',
        outputs: ['value'],
      }),
      buildNode({
        id: 'source-b',
        outputs: ['value'],
      }),
      buildNode({
        id: 'bundle-target',
        type: 'bundle',
        inputs: ['bundle'],
        config: {
          runtime: {
            inputCardinality: {
              bundle: 'many',
            },
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'source-a',
        fromPort: 'value',
        to: 'bundle-target',
        toPort: 'bundle',
      },
      {
        id: 'edge-b',
        from: 'source-b',
        fromPort: 'value',
        to: 'bundle-target',
        toPort: 'bundle',
      },
    ];

    const repaired = pruneSingleCardinalityIncomingEdges(nodes, edges);

    expect(repaired.edges).toHaveLength(2);
    expect(repaired.removedEdges).toHaveLength(0);
  });
});
