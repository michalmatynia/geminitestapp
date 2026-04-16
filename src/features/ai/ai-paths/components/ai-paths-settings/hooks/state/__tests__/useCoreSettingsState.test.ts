import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCoreSettingsState } from '../useCoreSettingsState';

const mockState = vi.hoisted(() => ({
  graphState: {
    nodes: [{ id: 'node-1' }],
    edges: [{ id: 'edge-1' }],
    paths: [{ id: 'path-1', name: 'Path One' }],
    pathConfigs: { 'path-1': { id: 'path-1' } },
    activePathId: 'path-1' as string | null,
    isPathLocked: false,
    isPathActive: true,
    pathName: 'Primary Path',
    pathDescription: 'Primary description',
    activeTrigger: 'Product Modal - Context Filter',
  },
  graphActions: {
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    setPaths: vi.fn(),
    setPathConfigs: vi.fn(),
    setActivePathId: vi.fn(),
    setIsPathLocked: vi.fn(),
    setIsPathActive: vi.fn(),
    setPathName: vi.fn(),
    setPathDescription: vi.fn(),
    setActiveTrigger: vi.fn(),
  },
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphDataState: () => mockState.graphState,
  usePathMetadataState: () => mockState.graphState,
  useGraphActions: () => mockState.graphActions,
}));

describe('useCoreSettingsState', () => {
  beforeEach(() => {
    mockState.graphState = {
      nodes: [{ id: 'node-1' }],
      edges: [{ id: 'edge-1' }],
      paths: [{ id: 'path-1', name: 'Path One' }],
      pathConfigs: { 'path-1': { id: 'path-1' } },
      activePathId: 'path-1',
      isPathLocked: false,
      isPathActive: true,
      pathName: 'Primary Path',
      pathDescription: 'Primary description',
      activeTrigger: 'Product Modal - Context Filter',
    };
    Object.values(mockState.graphActions).forEach((fn) => fn.mockReset());
  });

  it('returns graph state values and direct collection action passthroughs', () => {
    const { result } = renderHook(() => useCoreSettingsState());

    expect(result.current.nodes).toBe(mockState.graphState.nodes);
    expect(result.current.setNodes).toBe(mockState.graphActions.setNodes);
    expect(result.current.edges).toBe(mockState.graphState.edges);
    expect(result.current.setEdges).toBe(mockState.graphActions.setEdges);
    expect(result.current.paths).toBe(mockState.graphState.paths);
    expect(result.current.setPaths).toBe(mockState.graphActions.setPaths);
    expect(result.current.pathConfigs).toBe(mockState.graphState.pathConfigs);
    expect(result.current.setPathConfigs).toBe(mockState.graphActions.setPathConfigs);
    expect(result.current.activePathId).toBe('path-1');
    expect(result.current.isPathLocked).toBe(false);
    expect(result.current.isPathActive).toBe(true);
    expect(result.current.pathName).toBe('Primary Path');
    expect(result.current.pathDescription).toBe('Primary description');
    expect(result.current.activeTrigger).toBe('Product Modal - Context Filter');
  });

  it('resolves value and updater setters against current graph state', () => {
    const { result } = renderHook(() => useCoreSettingsState());

    act(() => {
      result.current.setActivePathId((prev) => `${prev}-copy`);
      result.current.setActivePathId(null);
      result.current.setIsPathLocked((prev) => !prev);
      result.current.setIsPathLocked(0 as never);
      result.current.setIsPathActive((prev) => !prev);
      result.current.setIsPathActive('' as never);
      result.current.setPathName((prev) => `${prev} Updated`);
      result.current.setPathDescription((prev) => `${prev} Updated`);
      result.current.setActiveTrigger((prev) => `${prev} v2`);
    });

    expect(mockState.graphActions.setActivePathId).toHaveBeenNthCalledWith(1, 'path-1-copy');
    expect(mockState.graphActions.setActivePathId).toHaveBeenNthCalledWith(2, null);
    expect(mockState.graphActions.setIsPathLocked).toHaveBeenNthCalledWith(1, true);
    expect(mockState.graphActions.setIsPathLocked).toHaveBeenNthCalledWith(2, false);
    expect(mockState.graphActions.setIsPathActive).toHaveBeenNthCalledWith(1, false);
    expect(mockState.graphActions.setIsPathActive).toHaveBeenNthCalledWith(2, false);
    expect(mockState.graphActions.setPathName).toHaveBeenCalledWith('Primary Path Updated');
    expect(mockState.graphActions.setPathDescription).toHaveBeenCalledWith(
      'Primary description Updated'
    );
    expect(mockState.graphActions.setActiveTrigger).toHaveBeenCalledWith(
      'Product Modal - Context Filter v2'
    );
  });
});
