// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TreeActionsProvider } from './useTreeActionsContext';
import {
  useTreeActions,
  useTreeActionsActions,
  useTreeActionsState,
} from './useTreeActionsContext.hooks';

const mocks = vi.hoisted(() => ({
  autoExpand: vi.fn(),
  dispatch: vi.fn(),
  toggleExpand: vi.fn(),
  useAutoExpand: vi.fn(),
  usePageBuilder: vi.fn(),
  useTreeBlockActions: vi.fn(),
  useTreeGridActions: vi.fn(),
  useTreeSectionActions: vi.fn(),
}));

vi.mock('./useAutoExpand', () => ({
  useAutoExpand: (...args: unknown[]) => mocks.useAutoExpand(...args),
}));

vi.mock('./usePageBuilderContext', () => ({
  usePageBuilder: () => mocks.usePageBuilder(),
}));

vi.mock('./useTreeBlockActions', () => ({
  useTreeBlockActions: (...args: unknown[]) => mocks.useTreeBlockActions(...args),
}));

vi.mock('./useTreeSectionActions', () => ({
  useTreeSectionActions: (...args: unknown[]) => mocks.useTreeSectionActions(...args),
}));

vi.mock('./useTreeGridActions', () => ({
  useTreeGridActions: (...args: unknown[]) => mocks.useTreeGridActions(...args),
}));

describe('useTreeActionsContext', () => {
  beforeEach(() => {
    mocks.autoExpand.mockReset();
    mocks.dispatch.mockReset();
    mocks.toggleExpand.mockReset();
    mocks.useAutoExpand.mockReset();
    mocks.usePageBuilder.mockReset();
    mocks.useTreeBlockActions.mockReset();
    mocks.useTreeGridActions.mockReset();
    mocks.useTreeSectionActions.mockReset();

    mocks.usePageBuilder.mockReturnValue({
      dispatch: mocks.dispatch,
      state: { sections: [] },
    });

    mocks.useAutoExpand.mockReturnValue({
      autoExpand: mocks.autoExpand,
      toggleExpand: mocks.toggleExpand,
    });

    mocks.useTreeBlockActions.mockReturnValue({
      addBlock: vi.fn(),
      addBlockToColumn: vi.fn(),
      addElementToNestedBlock: vi.fn(),
      addElementToSectionBlock: vi.fn(),
      dropBlock: vi.fn(),
      dropBlockToColumn: vi.fn(),
      dropBlockToSection: vi.fn(),
      dropBlockToRow: vi.fn(),
      dropBlockToSlideshowFrame: vi.fn(),
      removeBlock: vi.fn(),
    });

    mocks.useTreeSectionActions.mockReturnValue({
      addSection: vi.fn(),
      removeSection: vi.fn(),
      duplicateSection: vi.fn(),
      toggleSectionVisibility: vi.fn(),
      dropSectionInZone: vi.fn(),
      dropSectionToColumn: vi.fn(),
      dropSectionToSlideshowFrame: vi.fn(),
      convertSectionToBlock: vi.fn(),
      promoteBlockToSection: vi.fn(),
      pasteSection: vi.fn(),
    });

    mocks.useTreeGridActions.mockReturnValue({
      addGridRow: vi.fn(),
      removeGridRow: vi.fn(),
      addColumnToRow: vi.fn(),
      removeColumnFromRow: vi.fn(),
    });
  });

  it('throws clear errors outside the provider', () => {
    expect(() => renderHook(() => useTreeActionsState())).toThrow(
      'useTreeActionsState must be used within a TreeActionsProvider'
    );
    expect(() => renderHook(() => useTreeActionsActions())).toThrow(
      'useTreeActionsActions must be used within a TreeActionsProvider'
    );
  });

  it('provides merged state and actions through the provider', () => {
    const expandedIds = new Set(['section-1']);
    const setExpandedIds = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TreeActionsProvider expandedIds={expandedIds} setExpandedIds={setExpandedIds}>
        {children}
      </TreeActionsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useTreeActionsActions(),
        merged: useTreeActions(),
        state: useTreeActionsState(),
      }),
      { wrapper }
    );

    result.current.actions.selectNode('node-1');

    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'SELECT_NODE', nodeId: 'node-1' });
    expect(result.current.state.expandedIds).toBe(expandedIds);
    expect(result.current.actions.toggleExpand).toBe(mocks.toggleExpand);
    expect(result.current.actions.autoExpand).toBe(mocks.autoExpand);
    expect(result.current.merged.expandedIds).toBe(expandedIds);
  });
});
