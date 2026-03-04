import { describe, expect, it } from 'vitest';

import type { Edge, PathConfig } from '@/shared/contracts/ai-paths';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import {
  deserializeSemanticCanvasToPathConfig,
  parseAndDeserializeSemanticCanvas,
  serializePathConfigToSemanticCanvas,
} from '../index';
import {
  applySemanticSubgraphToPathConfig,
  buildSemanticSubgraphFromPathConfig,
} from '../subgraph';

describe('semantic grammar canvas serialization', () => {
  it('round-trips canvas config through semantic document', () => {
    const original = createDefaultPathConfig('path_semantic_roundtrip');
    const semantic = serializePathConfigToSemanticCanvas(original, {
      includeConnections: true,
      exportedAt: '2026-02-19T00:00:00.000Z',
    });

    expect(semantic.specVersion).toBe('ai-paths.semantic-grammar.v1');
    expect(semantic.kind).toBe('canvas');
    expect(semantic.path.id).toBe(original.id);
    expect(semantic.nodes.length).toBe(original.nodes.length);
    expect(semantic.edges.length).toBe(original.edges.length);

    const deserialized = deserializeSemanticCanvasToPathConfig(semantic);
    expect(deserialized.id).toBe(original.id);
    expect(deserialized.nodes.length).toBe(original.nodes.length);
    expect(deserialized.edges.length).toBe(original.edges.length);
  });

  it('parses and deserializes semantic input with validation', () => {
    const original = createDefaultPathConfig('path_semantic_parse');
    const semantic = serializePathConfigToSemanticCanvas(original);
    const parsed = parseAndDeserializeSemanticCanvas(semantic);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.id).toBe(original.id);
      expect(parsed.value.nodes.length).toBe(original.nodes.length);
    }
  });

  it('does not upgrade alias-only edge fields during semantic serialization', () => {
    const config = createDefaultPathConfig('path_semantic_alias_only_edge');
    const fromNode = config.nodes[0]!;
    const toNode = config.nodes[1]!;
    config.edges = [
      {
        id: 'edge-legacy-alias-shape',
        source: fromNode.id,
        target: toNode.id,
        sourceHandle: 'entityJson',
        targetHandle: 'entityJson',
      } as Edge,
    ];

    const semantic = serializePathConfigToSemanticCanvas(config, {
      includeConnections: false,
      sortById: false,
    });
    const firstEdge = semantic.edges[0];

    expect(semantic.edges).toHaveLength(1);
    expect(firstEdge).toBeDefined();
    expect(firstEdge?.id).toBe('edge-legacy-alias-shape');
    expect(firstEdge?.fromNodeId).toBe('');
    expect(firstEdge?.toNodeId).toBe('');
    expect(firstEdge).not.toHaveProperty('fromPort');
    expect(firstEdge).not.toHaveProperty('toPort');
  });

  it('keeps deserialized semantic edges in canonical from/to shape only', () => {
    const original = createDefaultPathConfig('path_semantic_deserialize_canonical_edges');
    const semantic = serializePathConfigToSemanticCanvas(original);

    const deserialized = deserializeSemanticCanvasToPathConfig(semantic);
    const firstEdge = deserialized.edges[0] as Record<string, unknown>;

    expect(firstEdge).toBeDefined();
    expect(firstEdge['from']).toBeTruthy();
    expect(firstEdge['to']).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(firstEdge, 'source')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(firstEdge, 'target')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(firstEdge, 'sourceHandle')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(firstEdge, 'targetHandle')).toBe(false);
  });
});

describe('semantic grammar subgraph operations', () => {
  it('builds and applies subgraph package to target path', () => {
    const source = createDefaultPathConfig('path_semantic_source');
    const selectedNodeIds = source.nodes.slice(0, 2).map((node) => node.id);
    const subgraph = buildSemanticSubgraphFromPathConfig(source, {
      selectedNodeIds,
      exportedAt: '2026-02-19T00:00:00.000Z',
    });

    expect(subgraph.kind).toBe('subgraph');
    expect(subgraph.nodes.length).toBe(selectedNodeIds.length);

    const target = createDefaultPathConfig('path_semantic_target');
    const applied = applySemanticSubgraphToPathConfig(target, subgraph, {
      idPrefix: 'copy',
      positionOffset: { x: 40, y: 40 },
    });

    expect(applied.pathConfig.nodes.length).toBe(target.nodes.length + subgraph.nodes.length);
    expect(Object.keys(applied.nodeIdMap)).toHaveLength(subgraph.nodes.length);
    const firstAppliedEdgeId = Object.values(applied.edgeIdMap)[0];
    const firstAppliedEdge = applied.pathConfig.edges.find(
      (edge: Edge): boolean => edge.id === firstAppliedEdgeId
    ) as Record<string, unknown> | undefined;
    expect(firstAppliedEdge).toBeDefined();
    expect(firstAppliedEdge?.['from']).toBeTruthy();
    expect(firstAppliedEdge?.['to']).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'source')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'target')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'sourceHandle')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'targetHandle')).toBe(false);
  });

  it('preserves existing path when parsed semantic document fails', () => {
    const target: PathConfig = createDefaultPathConfig('path_semantic_invalid');
    const invalid = {
      kind: 'canvas',
      path: {},
    };
    const parsed = parseAndDeserializeSemanticCanvas(invalid);
    expect(parsed.ok).toBe(false);
    expect(target.nodes.length).toBeGreaterThan(0);
  });
});
