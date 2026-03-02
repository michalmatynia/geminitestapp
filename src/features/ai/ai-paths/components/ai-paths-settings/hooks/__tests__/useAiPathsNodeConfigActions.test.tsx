import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';

import { useAiPathsNodeConfigActions } from '../useAiPathsNodeConfigActions';

describe('useAiPathsNodeConfigActions', () => {
  it('updates the explicitly requested node id when provided', () => {
    let nodes: AiNode[] = [
      {
        id: 'node-a',
        type: 'model',
        title: 'A',
        description: '',
        inputs: [],
        outputs: [],
        position: { x: 0, y: 0 },
        data: {},
        config: { model: { modelId: 'model-old', temperature: 0.7, maxTokens: 800, vision: false } },
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: null,
      },
      {
        id: 'node-b',
        type: 'model',
        title: 'B',
        description: '',
        inputs: [],
        outputs: [],
        position: { x: 0, y: 0 },
        data: {},
        config: { model: { modelId: 'model-b', temperature: 0.7, maxTokens: 800, vision: false } },
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: null,
      },
    ];

    const setNodes = (updater: (prev: AiNode[]) => AiNode[]): void => {
      nodes = updater(nodes);
    };

    const { result } = renderHook(() =>
      useAiPathsNodeConfigActions({
        selectedNodeId: 'node-b',
        setNodes,
      })
    );

    act(() => {
      result.current.updateSelectedNode(
        {
          config: {
            model: {
              modelId: 'model-new',
              temperature: 0.3,
              maxTokens: 500,
              vision: false,
            },
          },
        },
        { nodeId: 'node-a' }
      );
    });

    expect(nodes[0]?.config?.model?.modelId).toBe('model-new');
    expect(nodes[1]?.config?.model?.modelId).toBe('model-b');
  });
});
