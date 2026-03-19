import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAiPathsSettingsDerivedState } from '../useAiPathsSettingsDerivedState';

describe('useAiPathsSettingsDerivedState', () => {
  const nodes = [
    { id: 'node-1', title: 'First Node' },
    { id: 'node-2', title: 'Second Node' },
  ] as never;

  const paths = [
    { id: 'path-1', name: 'Path One' },
    { id: 'path-2', name: 'Path Two' },
    { id: 'path-3', name: 'Path Three' },
  ] as never;

  it('derives the selected node and per-path flags with config fallbacks', () => {
    const { result } = renderHook(() =>
      useAiPathsSettingsDerivedState({
        nodes,
        selectedNodeId: 'node-2',
        paths,
        pathConfigs: {
          'path-1': { isLocked: true, isActive: false },
          'path-2': { isLocked: false, isActive: true },
        } as never,
        autoSaveStatus: 'idle',
      })
    );

    expect(result.current.selectedNode).toEqual(nodes[1]);
    expect(result.current.pathFlagsById).toEqual({
      'path-1': { isLocked: true, isActive: false },
      'path-2': { isLocked: false, isActive: true },
      'path-3': { isLocked: false, isActive: true },
    });
    expect(result.current.autoSaveLabel).toBe('');
    expect(result.current.autoSaveClasses).toBe('');
  });

  it('returns null for a missing selected node id', () => {
    const { result } = renderHook(() =>
      useAiPathsSettingsDerivedState({
        nodes,
        selectedNodeId: 'missing-node',
        paths: [],
        pathConfigs: {},
        autoSaveStatus: 'idle',
      })
    );

    expect(result.current.selectedNode).toBeNull();
  });

  it.each([
    ['saving', 'Saving...', 'text-yellow-500'],
    ['saved', 'Saved', 'text-green-500'],
    ['error', 'Save error', 'text-red-500'],
    ['idle', '', ''],
  ] as const)(
    'maps auto-save status %s to the expected label and classes',
    (autoSaveStatus, label, classes) => {
      const { result } = renderHook(() =>
        useAiPathsSettingsDerivedState({
          nodes: [],
          selectedNodeId: null,
          paths: [],
          pathConfigs: {},
          autoSaveStatus,
        })
      );

      expect(result.current.autoSaveLabel).toBe(label);
      expect(result.current.autoSaveClasses).toBe(classes);
    }
  );
});
