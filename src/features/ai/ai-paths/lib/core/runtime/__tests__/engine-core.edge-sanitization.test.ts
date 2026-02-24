import { describe, expect, it } from 'vitest';

import { evaluateGraphClient } from '@/features/ai/ai-paths/lib/core/runtime/engine-client';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNodes = (): AiNode[] => [
  {
    id: 'node-constant',
    type: 'constant',
    title: 'Constant',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      constant: {
        value: 'hello',
      },
    },
    position: { x: 0, y: 0 },
  },
  {
    id: 'node-viewer',
    type: 'viewer',
    title: 'Viewer',
    description: '',
    inputs: ['value'],
    outputs: ['value'],
    config: {
      viewer: {
        outputs: {
          value: 'value',
        },
      },
    },
    position: { x: 140, y: 0 },
  },
];

describe('engine-core edge sanitization', () => {
  it('evaluates graphs without crashing when edges are provided in from/to format', async () => {
    const nodes = buildNodes();
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-constant',
        to: 'node-viewer',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraphClient({
      nodes,
      edges,
      reportAiPathsError: (): void => {},
    });

    expect(result.status).toBe('completed');
    expect(result.outputs?.['node-constant']?.['value']).toBe('hello');
  });
});
