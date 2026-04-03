import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

import { getNodeInputPortCardinality } from './graph.nodes';

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: patch.id ?? 'node-1',
    type: patch.type ?? 'bundle',
    title: patch.title ?? 'Node',
    description: '',
    position: patch.position ?? { x: 0, y: 0 },
    data: {},
    inputs: patch.inputs ?? [],
    outputs: patch.outputs ?? [],
    ...patch,
  }) as AiNode;

describe('getNodeInputPortCardinality', () => {
  it('uses normalized runtime input cardinality aliases when present', () => {
    const node = buildNode({
      inputs: ['image_urls'],
      config: {
        runtime: {
          inputCardinality: {
            imageUrls: 'many',
          },
        },
      },
    });

    expect(getNodeInputPortCardinality(node, 'image_urls')).toBe('many');
  });

  it('falls back to legacy many ports when no runtime cardinality is present', () => {
    const node = buildNode({
      inputs: ['bundle', 'value'],
    });

    expect(getNodeInputPortCardinality(node, 'bundle')).toBe('many');
    expect(getNodeInputPortCardinality(node, 'value')).toBe('one');
  });
});
