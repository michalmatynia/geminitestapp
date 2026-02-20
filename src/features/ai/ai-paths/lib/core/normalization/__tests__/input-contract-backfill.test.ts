import { describe, expect, it } from 'vitest';

import {
  backfillNodePortContracts,
  backfillPathConfigNodeContracts,
  normalizeNodes,
} from '@/features/ai/ai-paths/lib/core/normalization';
import { createDefaultPathConfig } from '@/features/ai/ai-paths/lib/core/utils/factory';
import type { AiNode } from '@/shared/contracts/ai-paths';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    type: 'model',
    title: 'Model',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['prompt', 'images'],
    outputs: ['result'],
    ...patch,
  }) as AiNode;

describe('input contract backfill', () => {
  it('backfills node contracts from palette defaults', () => {
    const node = buildNode({
      id: 'model-1',
      type: 'model',
      title: 'Model',
      inputs: ['prompt', 'images'],
      outputs: ['result', 'jobId'],
    });

    const result = backfillNodePortContracts([node]);
    expect(result.changed).toBe(true);
    expect(result.changedNodeIds).toContain('model-1');
    expect(result.nodes[0]?.inputContracts).toMatchObject({
      prompt: { required: true },
      images: { required: false },
    });
  });

  it('keeps explicit node contract overrides while adding missing defaults', () => {
    const node = buildNode({
      id: 'model-override',
      inputContracts: {
        prompt: { required: false },
      },
    });

    const result = backfillNodePortContracts([node]);
    expect(result.nodes[0]?.inputContracts).toMatchObject({
      prompt: { required: false },
      images: { required: false },
    });
  });

  it('backfills path config contracts in an idempotent way', () => {
    const path = createDefaultPathConfig('path-contract-migration');
    path.nodes = normalizeNodes([
      buildNode({
        id: 'model-path',
        inputContracts: undefined,
      }),
    ]);

    path.nodes = path.nodes.map((node: AiNode): AiNode => {
      if (node.id !== 'model-path') return node;
      const next = { ...node };
      delete (next as { inputContracts?: unknown }).inputContracts;
      return next;
    });

    const first = backfillPathConfigNodeContracts(path);
    expect(first.changed).toBe(true);
    expect(first.changedNodeIds).toContain('model-path');

    const second = backfillPathConfigNodeContracts(first.config);
    expect(second.changed).toBe(false);
    expect(second.changedNodeIds).toEqual([]);
  });
});

