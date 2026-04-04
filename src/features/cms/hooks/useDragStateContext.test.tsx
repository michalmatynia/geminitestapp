// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DragStateProvider,
  useDragState,
  useDragStateActions,
  useDragStateState,
} from './useDragStateContext';

describe('useDragStateContext', () => {
  it('throws clear errors outside the provider', () => {
    expect(() => renderHook(() => useDragStateState())).toThrow(
      'useDragStateState must be used within a DragStateProvider'
    );
    expect(() => renderHook(() => useDragStateActions())).toThrow(
      'useDragStateActions must be used within a DragStateProvider'
    );
  });

  it('tracks block and section drag lifecycle through the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DragStateProvider>{children}</DragStateProvider>
    );

    const { result } = renderHook(() => useDragState(), { wrapper });

    expect(result.current.isDraggingBlock).toBe(false);
    expect(result.current.isDraggingSection).toBe(false);

    act(() => {
      result.current.startBlockDrag({
        id: 'block-1',
        type: 'Heading',
        fromSectionId: 'section-1',
        fromColumnId: null,
        fromParentBlockId: null,
      });
    });

    expect(result.current.isDraggingBlock).toBe(true);
    expect(result.current.state.block.id).toBe('block-1');

    act(() => {
      result.current.startSectionDrag({
        id: 'section-2',
        type: 'Block',
        index: 1,
        zone: 'template',
      });
    });

    expect(result.current.isDraggingSection).toBe(true);
    expect(result.current.state.section.id).toBe('section-2');

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.isDraggingBlock).toBe(false);
    expect(result.current.isDraggingSection).toBe(false);
    expect(result.current.state.block.id).toBeNull();
    expect(result.current.state.section.id).toBeNull();
  });
});
