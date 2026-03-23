import { describe, expect, it } from 'vitest';

import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';

import { palette } from '../../definitions';
import { repairPathNodeIdentities } from '../../utils';

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

const buildPathConfig = (patch?: Partial<PathConfig>): PathConfig =>
  ({
    id: 'path-node-identity',
    version: 1,
    name: 'Path',
    description: '',
    trigger: 'manual',
    updatedAt: '2026-02-23T00:00:00.000Z',
    nodes: [],
    edges: [],
    ...patch,
  }) as PathConfig;

describe('repairPathNodeIdentities', () => {
  it('backfills nodeTypeId and instanceId for valid unique node ids', () => {
    const config = buildPathConfig({
      nodes: [
        buildNode({
          id: 'node-parser',
          type: 'parser',
          title: 'JSON Parser',
          outputs: ['value'],
        }),
      ],
    });

    const repaired = repairPathNodeIdentities(config, { palette });
    const repairedNode = repaired.config.nodes[0];
    const parserDefinition = palette.find(
      (definition) => definition.type === 'parser' && definition.title === 'JSON Parser'
    );

    expect(repaired.changed).toBe(true);
    expect(repairedNode?.id).toMatch(/^node-[a-f0-9]{24}$/);
    expect(repairedNode?.id).not.toBe('node-parser');
    expect(repairedNode?.instanceId).toBe(repairedNode?.id);
    expect(repairedNode?.nodeTypeId).toBe(parserDefinition?.nodeTypeId);
  });

  it('repairs duplicate node ids and remaps edges/ui/runtime/sample maps to the first retained id', () => {
    const config = buildPathConfig({
      nodes: [
        buildNode({
          id: 'dup-node',
          type: 'parser',
          title: 'JSON Parser',
          outputs: ['value'],
        }),
        buildNode({
          id: 'dup-node',
          type: 'model',
          title: 'Model',
          inputs: ['prompt'],
          outputs: ['result'],
        }),
        buildNode({
          id: 'sink-node',
          type: 'viewer',
          title: 'Result Viewer',
        }),
      ],
      edges: [
        {
          id: 'edge-out',
          from: 'dup-node',
          to: 'sink-node',
          fromPort: 'value',
          toPort: 'value',
        },
        {
          id: 'edge-in',
          from: 'sink-node',
          to: 'dup-node',
          fromPort: 'value',
          toPort: 'prompt',
        },
      ],
      uiState: {
        selectedNodeId: 'dup-node',
      },
      runtimeState: {
        inputs: { 'dup-node': { prompt: 'hello' } },
        outputs: { 'dup-node': { result: 'world' } },
        history: { 'dup-node': [{ nodeId: 'dup-node' }] },
        hashes: { 'dup-node': 'hash-1' },
        hashTimestamps: { 'dup-node': 1 },
        nodeStatuses: { 'dup-node': 'completed' },
        nodeOutputs: { 'dup-node': { result: 'world' } },
      },
      parserSamples: {
        'dup-node': { entityType: 'product', entityId: '1' },
      },
      updaterSamples: {
        'dup-node': { entityType: 'product', entityId: '1' },
      },
    });

    const repaired = repairPathNodeIdentities(config, { palette });
    const repairedIds = repaired.config.nodes.map((node: AiNode): string => node.id);
    const firstNode = repaired.config.nodes[0];
    const secondNode = repaired.config.nodes[1];

    expect(repaired.changed).toBe(true);
    expect(firstNode?.id).toMatch(/^node-[a-f0-9]{24}$/);
    expect(secondNode?.id).toMatch(/^node-[a-f0-9]{24}$/);
    expect(firstNode?.id).not.toBe(secondNode?.id);
    expect(new Set(repairedIds).size).toBe(repairedIds.length);

    expect(firstNode?.instanceId).toBe(firstNode?.id);
    expect(secondNode?.instanceId).toBe(secondNode?.id);
    expect(firstNode?.nodeTypeId).toBe(
      palette.find((definition) => definition.type === 'parser')?.nodeTypeId
    );
    expect(secondNode?.nodeTypeId).toBe(
      palette.find((definition) => definition.type === 'model')?.nodeTypeId
    );

    expect(
      repaired.config.edges.every(
        (edge) => edge.from !== secondNode?.id && edge.to !== secondNode?.id
      )
    ).toBe(true);
    expect(repaired.config.uiState?.selectedNodeId).toBe(firstNode?.id);

    const runtimeState = repaired.config.runtimeState as Record<string, unknown>;
    const nodeStatuses = runtimeState['nodeStatuses'] as Record<string, unknown>;
    expect(Object.keys(nodeStatuses)).toEqual([firstNode?.id]);
    expect(
      (repaired.config.parserSamples as Record<string, unknown>)[firstNode?.id as string]
    ).toBeDefined();
    expect(
      (repaired.config.updaterSamples as Record<string, unknown>)[firstNode?.id as string]
    ).toBeDefined();
    expect(repaired.warnings.some((warning) => warning.code === 'duplicate_node_id')).toBe(true);
  });

  it('generates missing ids and remaps persisted string runtime/sample state keys', () => {
    const config = buildPathConfig({
      nodes: [
        buildNode({
          id: '',
          type: 'prompt',
          title: 'Prompt',
          inputs: ['context'],
          outputs: ['prompt'],
        }),
      ],
      parserSamples: {
        '': { entityType: 'product', entityId: '123' },
      },
      runtimeState: JSON.stringify({
        inputs: { '': { context: { id: 123 } } },
        outputs: { '': { prompt: 'abc' } },
      }),
    });

    const repaired = repairPathNodeIdentities(config, { palette });
    const repairedNode = repaired.config.nodes[0];
    const repairedRuntimeState = JSON.parse(repaired.config.runtimeState as string) as Record<
      string,
      Record<string, unknown>
    >;
    const promptDefinition = palette.find(
      (definition) => definition.type === 'prompt' && definition.title === 'Prompt'
    );

    expect(repairedNode?.id).toMatch(/^node-[a-f0-9]{24}$/);
    expect(repairedNode?.instanceId).toBe(repairedNode?.id);
    expect(repairedNode?.nodeTypeId).toBe(promptDefinition?.nodeTypeId);
    expect(Object.keys(repaired.config.parserSamples as Record<string, unknown>)).toEqual([
      repairedNode?.id,
    ]);
    expect(Object.keys(repairedRuntimeState['inputs'] ?? {})).toEqual([repairedNode?.id]);
    expect(repaired.warnings.some((warning) => warning.code === 'missing_node_id')).toBe(true);
  });

  it('drops malformed persisted string runtime state during identity repair', () => {
    const parserDefinition = palette.find(
      (definition) => definition.type === 'parser' && definition.title === 'JSON Parser'
    );
    if (!parserDefinition?.nodeTypeId) {
      throw new Error('Expected JSON Parser node type id in palette.');
    }

    const config = buildPathConfig({
      nodes: [
        buildNode({
          id: 'node-111111111111111111111111',
          instanceId: 'node-111111111111111111111111',
          nodeTypeId: parserDefinition.nodeTypeId,
          type: 'parser',
          title: 'JSON Parser',
          outputs: ['value'],
        }),
      ],
      runtimeState: '{"inputs":',
    });

    const repaired = repairPathNodeIdentities(config, { palette });

    expect(repaired.changed).toBe(true);
    expect(repaired.config.runtimeState).toBeUndefined();
  });
});
