import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiPathsRuntimeManagement } from '../useAiPathsRuntimeManagement';

const mockState = vi.hoisted(() => ({
  setRuntimeState: vi.fn(),
  pruneRuntimeInputsState: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => ({
    setRuntimeState: mockState.setRuntimeState,
  }),
}));

vi.mock('@/features/ai/ai-paths/logic/runtime-pruning', () => ({
  pruneRuntimeInputsState: (...args: unknown[]) => mockState.pruneRuntimeInputsState(...args),
}));

describe('useAiPathsRuntimeManagement', () => {
  beforeEach(() => {
    mockState.setRuntimeState.mockReset();
    mockState.pruneRuntimeInputsState.mockReset();
  });

  it('prunes runtime inputs by delegating through pruneRuntimeInputsState', () => {
    const removedEdges = [{ id: 'edge-1' }];
    const remainingEdges = [{ id: 'edge-2' }];
    const prevState = {
      inputs: { 'node-1': { value: 1 } },
      outputs: { 'node-2': { value: 2 } },
      status: 'running',
    };
    const nextState = { inputs: {}, outputs: {}, status: 'running' };
    mockState.pruneRuntimeInputsState.mockReturnValue(nextState);

    const { result } = renderHook(() => useAiPathsRuntimeManagement());

    act(() => {
      result.current.pruneRuntimeInputs(removedEdges, remainingEdges);
    });

    expect(mockState.setRuntimeState).toHaveBeenCalledTimes(1);
    const updater = mockState.setRuntimeState.mock.calls[0]?.[0] as (state: typeof prevState) => typeof nextState;
    expect(updater(prevState)).toBe(nextState);
    expect(mockState.pruneRuntimeInputsState).toHaveBeenCalledWith(
      prevState,
      removedEdges,
      remainingEdges
    );
  });

  it('skips runtime updates when clearRuntimeInputsForEdges receives no edges', () => {
    const { result } = renderHook(() => useAiPathsRuntimeManagement());

    act(() => {
      result.current.clearRuntimeInputsForEdges([]);
    });

    expect(mockState.setRuntimeState).not.toHaveBeenCalled();
    expect(mockState.pruneRuntimeInputsState).not.toHaveBeenCalled();
  });

  it('clears runtime inputs for edges and removes node runtime data by node id', () => {
    const targetEdges = [{ id: 'edge-3' }];
    const prevState = {
      inputs: {
        'node-1': { keep: true },
        'node-2': { remove: true },
      },
      outputs: {
        'node-1': { keep: true },
        'node-2': { remove: true },
      },
      status: 'idle',
    };
    const prunedState = { ...prevState, inputs: { 'node-1': { keep: true } } };
    mockState.pruneRuntimeInputsState.mockReturnValue(prunedState);

    const { result } = renderHook(() => useAiPathsRuntimeManagement());

    act(() => {
      result.current.clearRuntimeInputsForEdges(targetEdges);
      result.current.clearRuntimeForNode('node-2');
    });

    expect(mockState.setRuntimeState).toHaveBeenCalledTimes(2);

    const pruneUpdater = mockState.setRuntimeState.mock.calls[0]?.[0] as (
      state: typeof prevState
    ) => typeof prunedState;
    expect(pruneUpdater(prevState)).toBe(prunedState);
    expect(mockState.pruneRuntimeInputsState).toHaveBeenCalledWith(prevState, targetEdges, []);

    const clearNodeUpdater = mockState.setRuntimeState.mock.calls[1]?.[0] as (
      state: typeof prevState
    ) => typeof prevState;
    expect(clearNodeUpdater(prevState)).toEqual({
      ...prevState,
      inputs: {
        'node-1': { keep: true },
      },
      outputs: {
        'node-1': { keep: true },
      },
    });
  });
});
