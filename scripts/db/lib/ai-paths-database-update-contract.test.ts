import { describe, expect, it } from 'vitest';

import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

import { rewritePathConfigDatabaseUpdateContract } from './ai-paths-database-update-contract';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: patch.id ?? 'node-1',
    instanceId: patch.instanceId ?? patch.id ?? 'node-1',
    nodeTypeId: patch.nodeTypeId,
    type: patch.type ?? 'viewer',
    title: patch.title ?? 'Node',
    description: patch.description ?? '',
    inputs: patch.inputs ?? [],
    outputs: patch.outputs ?? [],
    position: patch.position ?? { x: 0, y: 0 },
    data: patch.data ?? {},
    config: patch.config,
  }) as AiNode;

const buildEdge = (patch: Partial<Edge>): Edge =>
  ({
    id: patch.id ?? 'edge-1',
    from: patch.from ?? 'from-1',
    to: patch.to ?? 'to-1',
    fromPort: patch.fromPort ?? 'value',
    toPort: patch.toPort ?? 'value',
  }) as Edge;

const buildConfig = (nodes: AiNode[], edges: Edge[] = []): PathConfig =>
  ({
    id: 'path-update-contract',
    version: 1,
    name: 'Path',
    description: '',
    trigger: 'manual',
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
  }) as PathConfig;

describe('rewritePathConfigDatabaseUpdateContract', () => {
  it('switches custom mode to mapping when template is equivalent to mappings', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'upstream-value',
          type: 'regex',
          outputs: ['value'],
        }),
        buildNode({
          id: 'upstream-result',
          type: 'regex',
          outputs: ['value'],
        }),
        buildNode({
          id: 'db-1',
          type: 'database',
          inputs: ['value', 'result', 'entityId'],
          outputs: ['result'],
          config: {
            database: {
              operation: 'update',
              updatePayloadMode: 'custom',
              updateTemplate:
                '{\n' +
                '  "$set": {\n' +
                '    "description_pl": "{{value.description_pl}}",\n' +
                '    "parameters": {{result.parameters}}\n' +
                '  }\n' +
                '}',
              mappings: [
                { targetPath: 'description_pl', sourcePort: 'value', sourcePath: 'description_pl' },
                { targetPath: 'parameters', sourcePort: 'result', sourcePath: 'parameters' },
              ],
            },
          },
        }),
      ],
      [
        buildEdge({
          id: 'edge-value',
          from: 'upstream-value',
          to: 'db-1',
          fromPort: 'value',
          toPort: 'value',
        }),
        buildEdge({
          id: 'edge-result',
          from: 'upstream-result',
          to: 'db-1',
          fromPort: 'value',
          toPort: 'result',
        }),
      ]
    );

    const rewritten = rewritePathConfigDatabaseUpdateContract(config);
    const dbNode = rewritten.config.nodes.find((node) => node.id === 'db-1');

    expect(rewritten.changed).toBe(true);
    expect(dbNode?.config?.database?.updatePayloadMode).toBe('mapping');
    expect(rewritten.updates).toEqual([
      expect.objectContaining({
        nodeId: 'db-1',
        fromMode: 'custom',
        toMode: 'mapping',
        reason: 'custom_mode_switched_mapping_equivalent_template',
      }),
    ]);
  });

  it('defaults missing mode to mapping when mappings exist and update template is empty', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'upstream-value',
          type: 'regex',
          outputs: ['value'],
        }),
        buildNode({
          id: 'db-2',
          type: 'database',
          inputs: ['value'],
          outputs: ['result'],
          config: {
            database: {
              operation: 'update',
              mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
              updateTemplate: '',
            },
          },
        }),
      ],
      [
        buildEdge({
          id: 'edge-db-2',
          from: 'upstream-value',
          to: 'db-2',
          fromPort: 'value',
          toPort: 'value',
        }),
      ]
    );

    const rewritten = rewritePathConfigDatabaseUpdateContract(config);
    const dbNode = rewritten.config.nodes.find((node) => node.id === 'db-2');

    expect(rewritten.changed).toBe(true);
    expect(dbNode?.config?.database?.updatePayloadMode).toBe('mapping');
    expect(rewritten.updates[0]?.reason).toBe('missing_mode_inferred_mapping_empty_template');
  });

  it('keeps custom mode when template is not equivalent to mappings', () => {
    const config = buildConfig([
      buildNode({
        id: 'db-3',
        type: 'database',
        inputs: ['value'],
        outputs: ['result'],
        config: {
          database: {
            operation: 'update',
            updatePayloadMode: 'custom',
            updateTemplate:
              '{\n  "$set": {\n    "description_pl": "{{value.description_pl}}",\n    "status": "draft"\n  }\n}',
            mappings: [
              { targetPath: 'description_pl', sourcePort: 'value', sourcePath: 'description_pl' },
            ],
          },
        },
      }),
    ]);

    const rewritten = rewritePathConfigDatabaseUpdateContract(config);

    expect(rewritten.changed).toBe(false);
    expect(rewritten.updates).toHaveLength(0);
  });

  it('reports mapping mode without mappings for manual review', () => {
    const config = buildConfig([
      buildNode({
        id: 'db-4',
        type: 'database',
        inputs: ['value'],
        outputs: ['result'],
        config: {
          database: {
            operation: 'update',
            updatePayloadMode: 'mapping',
            mappings: [],
          },
        },
      }),
    ]);

    const rewritten = rewritePathConfigDatabaseUpdateContract(config);

    expect(rewritten.changed).toBe(false);
    expect(rewritten.issues).toEqual([
      expect.objectContaining({
        nodeId: 'db-4',
        mode: 'mapping',
        reason: 'mapping_mode_missing_mappings',
      }),
    ]);
  });
});
