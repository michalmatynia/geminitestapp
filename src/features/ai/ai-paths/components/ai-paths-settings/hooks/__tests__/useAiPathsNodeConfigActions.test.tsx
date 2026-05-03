import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

import { useAiPathsNodeConfigActions } from '../useAiPathsNodeConfigActions';

const useGraphActionsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: useGraphActionsMock,
}));

describe('useAiPathsNodeConfigActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
        config: {
          model: { modelId: 'model-old', temperature: 0.7, maxTokens: 800, vision: false },
        },
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

    useGraphActionsMock.mockReturnValue({ setNodes });

    const { result } = renderHook(() => useAiPathsNodeConfigActions({ selectedNodeId: 'node-b' }));

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
