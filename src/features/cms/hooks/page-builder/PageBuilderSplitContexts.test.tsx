// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePageBuilderDispatch } from './PageDispatchContext';
import { usePageBuilderSelection } from './PageSelectionContext';
import { usePageBuilderState } from './PageStateContext';
import { PageBuilderProvider, initialState } from '../usePageBuilderContext';

import type { PageBuilderState } from '@/shared/contracts/cms';

function createTestState(): PageBuilderState {
  return {
    ...initialState,
    sections: [
      {
        id: 'section-1',
        type: 'Block',
        zone: 'template',
        parentSectionId: null,
        settings: {},
        blocks: [],
      },
    ],
    selectedNodeId: 'section-1',
  };
}

describe('PageBuilder split contexts', () => {
  it('throws clear errors outside the provider', () => {
    expect(() => renderHook(() => usePageBuilderState())).toThrow(
      'usePageBuilderState must be used within PageBuilderProvider'
    );
    expect(() => renderHook(() => usePageBuilderDispatch())).toThrow(
      'usePageBuilderDispatch must be used within PageBuilderProvider'
    );
    expect(() => renderHook(() => usePageBuilderSelection())).toThrow(
      'usePageBuilderSelection must be used within PageBuilderProvider'
    );
  });

  it('provides state, dispatch, and derived selection inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageBuilderProvider initialState={createTestState()}>{children}</PageBuilderProvider>
    );

    const { result } = renderHook(
      () => ({
        dispatch: usePageBuilderDispatch(),
        selection: usePageBuilderSelection(),
        state: usePageBuilderState(),
      }),
      { wrapper }
    );

    expect(result.current.state.selectedNodeId).toBe('section-1');
    expect(result.current.selection.selectedSection?.id).toBe('section-1');
    expect(result.current.selection.selectedBlock).toBeNull();
    expect(result.current.dispatch).toBeTypeOf('function');
  });
});
