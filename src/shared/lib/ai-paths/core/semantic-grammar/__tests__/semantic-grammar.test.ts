import { describe, expect, it } from 'vitest';

import type { Edge, PathConfig } from '@/shared/contracts/ai-paths';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import {
  deserializeSemanticCanvasToPathConfig,
  parseAndDeserializeSemanticCanvas,
  serializePathConfigToSemanticCanvas,
} from '../index';
import {
  applySemanticSubgraphToPathConfig,
  buildSemanticSubgraphFromPathConfig,
  findSubgraphDanglingEdges,
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

  it('rejects removed legacy trigger context modes in semantic canvas payloads', () => {
    const config = createDefaultPathConfig('path_semantic_removed_trigger_context');
    const seedNode = config.nodes[0];
    expect(seedNode).toBeDefined();
    if (!seedNode) return;
    config.nodes = [
      {
        ...seedNode,
        type: 'trigger',
        title: 'Trigger: Semantic',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_preferred',
          },
        },
      },
    ];
    config.edges = [];
    const semantic = serializePathConfigToSemanticCanvas(config);

    const parsed = parseAndDeserializeSemanticCanvas(semantic);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toMatch(/removed legacy Trigger context modes/i);
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
    expect([fromNode.id, '']).toContain(firstEdge?.fromNodeId ?? '');
    expect([toNode.id, '']).toContain(firstEdge?.toNodeId ?? '');
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
    if (Object.prototype.hasOwnProperty.call(firstEdge, 'source')) {
      expect(firstEdge['source']).toBe(firstEdge['from']);
    }
    if (Object.prototype.hasOwnProperty.call(firstEdge, 'target')) {
      expect(firstEdge['target']).toBe(firstEdge['to']);
    }
    if (Object.prototype.hasOwnProperty.call(firstEdge, 'sourceHandle')) {
      expect(firstEdge['sourceHandle']).toBe(firstEdge['fromPort']);
    }
    if (Object.prototype.hasOwnProperty.call(firstEdge, 'targetHandle')) {
      expect(firstEdge['targetHandle']).toBe(firstEdge['toPort']);
    }
  });

  it('preserves node-selected model config through semantic round-trip without injecting defaults', () => {
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) throw new Error('Missing starter_product_name_normalize template');
    const original = materializeStarterWorkflowPathConfig(
      template,
      {
        pathId: 'path_semantic_model_selection',
        seededDefault: false,
      }
    );
    const modelNode = original.nodes.find((node) => node.type === 'model');
    if (!modelNode) throw new Error('Expected model node');
    modelNode.config = {
      ...(modelNode.config ?? {}),
      model: {
        ...(modelNode.config?.model ?? {}),
        modelId: 'gpt-4.1-mini',
        vision: true,
      },
    };

    const semantic = serializePathConfigToSemanticCanvas(original);
    const deserialized = deserializeSemanticCanvasToPathConfig(semantic);
    const roundTrippedModelNode = deserialized.nodes.find((node) => node.id === modelNode.id);

    expect(roundTrippedModelNode?.config?.model?.modelId).toBe('gpt-4.1-mini');
    expect(roundTrippedModelNode?.config?.model?.vision).toBe(true);
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
    if (Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'source')) {
      expect(firstAppliedEdge?.['source']).toBe(firstAppliedEdge?.['from']);
    }
    if (Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'target')) {
      expect(firstAppliedEdge?.['target']).toBe(firstAppliedEdge?.['to']);
    }
    if (Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'sourceHandle')) {
      expect(firstAppliedEdge?.['sourceHandle']).toBe(firstAppliedEdge?.['fromPort']);
    }
    if (Object.prototype.hasOwnProperty.call(firstAppliedEdge ?? {}, 'targetHandle')) {
      expect(firstAppliedEdge?.['targetHandle']).toBe(firstAppliedEdge?.['toPort']);
    }
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

  it('treats alias-only edges as dangling in subgraph edge checks', () => {
    const config = createDefaultPathConfig('path_semantic_alias_dangling');
    const fromNode = config.nodes[0]!;
    const toNode = config.nodes[1]!;
    config.edges = [
      {
        id: 'edge-alias-only',
        source: fromNode.id,
        target: toNode.id,
      } as Edge,
    ];

    expect(findSubgraphDanglingEdges(config)).toEqual(['edge-alias-only']);
  });

  it('keeps canonical edges non-dangling in subgraph edge checks', () => {
    const config = createDefaultPathConfig('path_semantic_canonical_not_dangling');
    const fromNode = config.nodes[0]!;
    const toNode = config.nodes[1]!;
    config.edges = [
      {
        id: 'edge-canonical',
        from: fromNode.id,
        to: toNode.id,
      } as Edge,
    ];

    expect(findSubgraphDanglingEdges(config)).toEqual([]);
  });
});
