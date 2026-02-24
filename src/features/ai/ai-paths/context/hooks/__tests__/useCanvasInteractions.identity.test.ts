import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

import { palette } from '@/features/ai/ai-paths/lib/core/definitions';
import {
  createNodeInstanceId,
  resolveNodeTypeId,
} from '@/features/ai/ai-paths/lib/core/utils';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node-1',
    type: 'parser',
    title: 'JSON Parser',
    description: '',
    inputs: [],
    outputs: ['value'],
    position: { x: 0, y: 0 },
    data: {},
    ...patch,
  }) as AiNode;

describe('useCanvasInteractions identity behavior', () => {
  it('creates unique instance ids for new canvas nodes', () => {
    const usedIds = new Set<string>(['node-a', 'node-b']);
    const generated = createNodeInstanceId(usedIds);

    expect(generated).toMatch(/^node-[a-f0-9]{24}$/);
    expect(usedIds.has(generated)).toBe(true);

    const generatedSecond = createNodeInstanceId(usedIds);
    expect(generatedSecond).not.toBe(generated);
    expect(usedIds.has(generatedSecond)).toBe(true);
  });

  it('resolves dropped node type ids from palette definitions', () => {
    const parserDefinition = palette.find((definition) => definition.type === 'parser');
    expect(parserDefinition).toBeDefined();

    const resolvedTypeId = resolveNodeTypeId(
      {
        type: parserDefinition?.type ?? 'parser',
        title: parserDefinition?.title ?? 'JSON Parser',
        config: parserDefinition?.config,
      },
      palette
    );

    expect(resolvedTypeId).toBe(parserDefinition?.nodeTypeId);
  });

  it('re-ids duplicated nodes while preserving type id', () => {
    const parserDefinition = palette.find(
      (definition) => definition.type === 'parser'
    );
    const sourceNode = buildNode({
      id: 'node-source',
      instanceId: 'node-source',
      nodeTypeId: parserDefinition?.nodeTypeId,
    });
    const usedIds = new Set<string>(['node-source']);
    const duplicatedId = createNodeInstanceId(usedIds);

    const duplicatedNode: AiNode = {
      ...sourceNode,
      id: duplicatedId,
      instanceId: duplicatedId,
      nodeTypeId: resolveNodeTypeId(sourceNode, palette),
    };

    expect(duplicatedNode.id).not.toBe(sourceNode.id);
    expect(duplicatedNode.instanceId).toBe(duplicatedNode.id);
    expect(duplicatedNode.nodeTypeId).toBe(parserDefinition?.nodeTypeId);
  });
});
