// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';

import { GraphProvider, useGraphActions, useGraphState } from '../GraphContext';

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: patch.id ?? 'node-a',
    type: patch.type ?? 'template',
    title: patch.title ?? 'Node A',
    description: '',
    inputs: patch.inputs ?? [],
    outputs: patch.outputs ?? [],
    position: patch.position ?? { x: 100, y: 100 },
    data: {},
    createdAt: '2026-04-03T00:00:00.000Z',
    updatedAt: null,
    ...patch,
  }) as AiNode;

describe('GraphContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useGraphState())).toThrow(
      'useGraphState must be used within a GraphProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useGraphActions())).toThrow(
      'useGraphActions must be used within a GraphProvider'
    );
  });

  it('updates graph state inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <GraphProvider
        initialNodesData={[]}
        initialEdgesData={[]}
        initialPaths={[]}
        initialPathConfigs={{}}
        initialActivePathId={null}
      >
        {children}
      </GraphProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useGraphActions(),
        state: useGraphState(),
      }),
      { wrapper }
    );

    expect(result.current.state.nodes).toEqual([]);
    expect(result.current.state.pathName).toBe('Description Inference Path');
    expect(result.current.state.isPathActive).toBe(true);

    act(() => {
      result.current.actions.setPathName('Custom Graph Path');
      result.current.actions.togglePathActive();
      result.current.actions.addNode(buildNode());
    });

    expect(result.current.state.pathName).toBe('Custom Graph Path');
    expect(result.current.state.isPathActive).toBe(false);
    expect(result.current.state.nodes).toHaveLength(1);
    expect(result.current.state.nodes[0]?.id).toBe('node-a');
  });
});
