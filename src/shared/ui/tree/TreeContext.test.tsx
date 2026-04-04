// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TreeProvider, useTreeNodeState } from './TreeContext';

describe('TreeContext', () => {
  it('returns inert defaults outside the provider', () => {
    const { result } = renderHook(() => useTreeNodeState('node-1'));

    expect(result.current).toEqual({
      isSelected: false,
      isExpanded: false,
    });
  });

  it('derives node state and forwards handlers inside the provider', () => {
    const onToggleExpand = vi.fn();
    const onSelect = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TreeProvider
        value={{
          selectedIds: new Set(['node-1']),
          expandedIds: new Set(['node-1']),
          onToggleExpand,
          onSelect,
          isProcessing: true,
        }}
      >
        {children}
      </TreeProvider>
    );

    const { result } = renderHook(() => useTreeNodeState('node-1'), { wrapper });

    expect(result.current.isSelected).toBe(true);
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.isProcessing).toBe(true);

    act(() => {
      result.current.onToggleExpand?.();
      result.current.onSelect?.({ multi: true });
    });

    expect(onToggleExpand).toHaveBeenCalledWith('node-1');
    expect(onSelect).toHaveBeenCalledWith('node-1', { multi: true });
  });
});
