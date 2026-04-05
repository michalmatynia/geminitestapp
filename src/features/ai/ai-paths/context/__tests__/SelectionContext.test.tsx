// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SelectionProvider, useSelectionActions, useSelectionState } from '../SelectionContext';

describe('SelectionContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useSelectionState())).toThrow(
      'useSelectionState must be used within a SelectionProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useSelectionActions())).toThrow(
      'useSelectionActions must be used within a SelectionProvider'
    );
  });

  it('manages node and edge selection transitions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <SelectionProvider initialSelectedNodeId='node-a'>{children}</SelectionProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useSelectionActions(),
        state: useSelectionState(),
      }),
      { wrapper }
    );

    expect(result.current.state.selectedNodeId).toBe('node-a');
    expect(result.current.state.selectedNodeIds).toEqual(['node-a']);

    act(() => {
      result.current.actions.addNodeToSelection('node-b');
    });

    expect(result.current.state.selectedNodeIds).toEqual(['node-a', 'node-b']);
    expect(result.current.state.selectedNodeId).toBe('node-a');

    act(() => {
      result.current.actions.toggleNodeSelection('node-a');
    });

    expect(result.current.state.selectedNodeIds).toEqual(['node-b']);
    expect(result.current.state.selectedNodeId).toBe('node-b');

    act(() => {
      result.current.actions.selectEdge('edge-1');
    });

    expect(result.current.state.selectedEdgeId).toBe('edge-1');
    expect(result.current.state.selectedNodeId).toBeNull();
    expect(result.current.state.selectedNodeIds).toEqual([]);

    act(() => {
      result.current.actions.clearSelection();
    });

    expect(result.current.state.selectedEdgeId).toBeNull();
    expect(result.current.state.configOpen).toBe(false);
    expect(result.current.state.nodeConfigDirty).toBe(false);
    expect(result.current.state.nodeConfigDraft).toBeNull();
  });
});
