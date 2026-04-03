// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CaseResolverFolderTreeProvider,
  useCaseResolverFolderTreeDataContext,
  useCaseResolverFolderTreeUiActionsContext,
  useCaseResolverFolderTreeUiContext,
  useCaseResolverFolderTreeUiStateContext,
} from '@/features/case-resolver/context/CaseResolverFolderTreeContext';

const mocks = vi.hoisted(() => ({
  useCaseResolverFolderTreeRuntime: vi.fn(),
}));

vi.mock('@/features/case-resolver/context/useCaseResolverFolderTreeRuntime', () => ({
  useCaseResolverFolderTreeRuntime: (input: unknown) => mocks.useCaseResolverFolderTreeRuntime(input),
}));

describe('CaseResolverFolderTreeContext provider hooks', () => {
  beforeEach(() => {
    mocks.useCaseResolverFolderTreeRuntime.mockReturnValue({
      dataValue: {
        activeCaseId: null,
        rootNodes: [],
      },
      uiStateValue: {
        highlightedNodeFileAssetIds: [],
        showChildCaseFolders: true,
      },
    });
  });

  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useCaseResolverFolderTreeDataContext())).toThrow(
      'useCaseResolverFolderTreeDataContext must be used within CaseResolverFolderTreeProvider'
    );
    expect(() => renderHook(() => useCaseResolverFolderTreeUiStateContext())).toThrow(
      'useCaseResolverFolderTreeUiStateContext must be used within CaseResolverFolderTreeProvider'
    );
    expect(() => renderHook(() => useCaseResolverFolderTreeUiActionsContext())).toThrow(
      'useCaseResolverFolderTreeUiActionsContext must be used within CaseResolverFolderTreeProvider'
    );
  });

  it('provides split data, ui state, and ui actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseResolverFolderTreeProvider>{children}</CaseResolverFolderTreeProvider>
    );

    const { result } = renderHook(
      () => ({
        data: useCaseResolverFolderTreeDataContext(),
        ui: useCaseResolverFolderTreeUiContext(),
        uiActions: useCaseResolverFolderTreeUiActionsContext(),
        uiState: useCaseResolverFolderTreeUiStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.data).toMatchObject({
      activeCaseId: null,
      rootNodes: [],
    });
    expect(result.current.uiState).toMatchObject({
      highlightedNodeFileAssetIds: [],
      showChildCaseFolders: true,
    });
    expect(result.current.uiActions.setShowChildCaseFolders).toBeTypeOf('function');
    expect(result.current.uiActions.setHighlightedNodeFileAssetIds).toBeTypeOf('function');
    expect(result.current.ui).toMatchObject({
      highlightedNodeFileAssetIds: [],
      showChildCaseFolders: true,
    });
  });
});
