import { describe, expect, it } from 'vitest';

import { collectNodeInputs } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-input-collector';

describe('collectNodeInputs', () => {
  it('returns an empty object when a node has no incoming edges', () => {
    const result = collectNodeInputs(
      {
        id: 'target',
        type: 'template',
        inputs: ['value'],
        outputs: [],
        config: {},
      } as never,
      {},
      new Map()
    );

    expect(result).toEqual({});
  });

  it('collects compatible inputs, appends repeated values, and skips incompatible values without runtime contracts', () => {
    const node = {
      id: 'target',
      type: 'template',
      inputs: ['value', 'images'],
      outputs: [],
      config: {},
    } as never;

    const result = collectNodeInputs(
      node,
      {
        sourceA: { value: 'alpha' },
        sourceB: { value: 'beta' },
        sourceC: { image: 123 },
        sourceD: { image: 'https://cdn.example.com/image.png' },
      },
      new Map([
        [
          'target',
          [
            {
              id: 'edge-a',
              from: 'sourceA',
              to: 'target',
              fromPort: 'value',
              toPort: 'value',
            },
            {
              id: 'edge-b',
              from: 'sourceB',
              to: 'target',
              fromPort: 'value',
              toPort: 'value',
            },
            {
              id: 'edge-c',
              from: 'sourceC',
              to: 'target',
              fromPort: 'image',
              toPort: 'images',
            },
            {
              id: 'edge-d',
              from: 'sourceD',
              to: 'target',
              fromPort: 'image',
              toPort: 'images',
            },
          ],
        ],
      ])
    );

    expect(result).toEqual({
      value: ['alpha', 'beta'],
      images: 'https://cdn.example.com/image.png',
    });
  });

  it('accepts values through explicit runtime input contracts even when fallback port typing would reject them', () => {
    const node = {
      id: 'target',
      type: 'template',
      inputs: ['images'],
      outputs: [],
      config: {
        runtime: {
          inputContracts: {
            images: {
              kind: 'json',
            },
          },
        },
      },
    } as never;

    const result = collectNodeInputs(
      node,
      {
        sourceA: { image: 123 },
      },
      new Map([
        [
          'target',
          [
            {
              id: 'edge-a',
              from: 'sourceA',
              to: 'target',
              fromPort: 'image',
              toPort: 'images',
            },
          ],
        ],
      ])
    );

    expect(result).toEqual({
      images: 123,
    });
  });
});
