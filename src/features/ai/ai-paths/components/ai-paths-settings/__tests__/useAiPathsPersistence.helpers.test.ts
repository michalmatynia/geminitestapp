import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths';

import {
  collectInvalidPathSavePayloadIssues,
  normalizeLoadedPathMetas,
  resolvePersistedNodeConfigMismatch,
  shouldExposePathSaveRawMessage,
} from '../useAiPathsPersistence.helpers';
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

describe('shouldExposePathSaveRawMessage', () => {
  it('exposes canonical path contract errors only', () => {
    expect(
      shouldExposePathSaveRawMessage('AI Path config contains invalid or non-canonical edges.')
    ).toBe(true);
    expect(shouldExposePathSaveRawMessage('Invalid AI Paths runtime state payload.')).toBe(true);
    expect(shouldExposePathSaveRawMessage('Invalid payload')).toBe(true);
  });

  it('keeps generic save errors hidden behind fallback messaging', () => {
    expect(shouldExposePathSaveRawMessage('Failed to update AI Paths settings (500)')).toBe(false);
    expect(
      shouldExposePathSaveRawMessage(
        'Agent persona settings payload includes unsupported keys: plannerModel.'
      )
    ).toBe(false);
    expect(shouldExposePathSaveRawMessage('')).toBe(false);
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

describe('resolvePersistedNodeConfigMismatch', () => {
  it('returns null when the saved node config matches the expected config', () => {
    const config = createDefaultPathConfig('node_save_match');
    const expectedNode = config.nodes[0] as AiNode;
    const mismatch = resolvePersistedNodeConfigMismatch({
      expectedNode,
      expectedConfig: config,
      persistedConfig: config,
    });
    expect(mismatch).toBeNull();
  });

  it('reports persisted_node_missing when expected node cannot be found after save', () => {
    const config = createDefaultPathConfig('node_save_missing');
    const expectedNode = config.nodes[0] as AiNode;
    const persistedConfig = {
      ...config,
      nodes: config.nodes.filter((node: AiNode): boolean => node.id !== expectedNode.id),
    };
    const mismatch = resolvePersistedNodeConfigMismatch({
      expectedNode,
      expectedConfig: config,
      persistedConfig,
    });
    expect(mismatch).toEqual(
      expect.objectContaining({
        reason: 'persisted_node_missing',
        expectedNodeId: expectedNode.id,
      })
    );
  });

  it('reports config_mismatch when node exists but config payload differs', () => {
    const config = createDefaultPathConfig('node_save_mismatch');
    const expectedNode = config.nodes[0] as AiNode;
    const persistedConfig = {
      ...config,
      nodes: config.nodes.map(
        (node: AiNode): AiNode =>
          node.id === expectedNode.id
            ? ({ ...node, config: { constant: { value: 'changed' } } } as AiNode)
            : node
      ),
    };
    const mismatch = resolvePersistedNodeConfigMismatch({
      expectedNode,
      expectedConfig: config,
      persistedConfig,
    });
    expect(mismatch).toEqual(
      expect.objectContaining({
        reason: 'config_mismatch',
        expectedNodeId: expectedNode.id,
      })
    );
  });
});

describe('normalizeLoadedPathMetas', () => {
  it('normalizes names, timestamps, and keeps the most recent duplicate', () => {
    const metas = normalizeLoadedPathMetas([
      {
        id: ' path-a ',
        name: '  ',
        folderPath: '/drafts//seo/',
        createdAt: '',
        updatedAt: '',
      } as unknown as import('@/shared/contracts/ai-paths').PathMeta,
      {
        id: 'path-a',
        name: 'Alpha',
        folderPath: 'drafts/seo',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      } as unknown as import('@/shared/contracts/ai-paths').PathMeta,
      {
        id: 'path-b',
        name: 'Beta',
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z',
      } as unknown as import('@/shared/contracts/ai-paths').PathMeta,
    ]);

    expect(metas).toHaveLength(2);
    expect(metas[0]).toEqual(
      expect.objectContaining({
        id: 'path-a',
        name: 'Alpha',
        folderPath: 'drafts/seo',
        updatedAt: '2026-02-01T00:00:00.000Z',
      })
    );
    expect(metas[1]).toEqual(
      expect.objectContaining({
        id: 'path-b',
        name: 'Beta',
      })
    );
  });
});
