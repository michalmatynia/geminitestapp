import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

import { getNodeInputPortCardinality, getResolvedNodeInputPortContract } from './graph.nodes';

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

  it('resolves runtime contracts while preserving alias-matched runtime cardinality sources', () => {
    const node = buildNode({
      inputs: ['image_urls'],
      config: {
        runtime: {
          inputCardinality: {
            imageUrls: 'many',
          },
          inputContracts: {
            imageUrls: {
              required: true,
              kind: 'image_url',
            },
          },
        },
      },
    });

    expect(getResolvedNodeInputPortContract(node, 'image_urls')).toMatchObject({
      required: true,
      cardinality: 'many',
      cardinalitySource: 'runtime_cardinality',
      kind: 'image_url',
      source: 'runtime',
      declared: true,
    });
  });

  it('marks legacy prompt ports as required when no contracts are declared', () => {
    const node = buildNode({
      inputs: ['prompt'],
    });

    expect(getResolvedNodeInputPortContract(node, 'prompt')).toMatchObject({
      required: true,
      source: 'legacy',
      declared: false,
    });
  });
});
