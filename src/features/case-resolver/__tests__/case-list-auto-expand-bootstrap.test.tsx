import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCaseListAutoExpandBootstrap } from '@/features/case-resolver/components/list/hooks/useCaseListAutoExpandBootstrap';

describe('useCaseListAutoExpandBootstrap', () => {
  it('does not auto-expand when persisted ui state exists', () => {
    const setExpandedNodeIds = vi.fn();

    renderHook(() =>
      useCaseListAutoExpandBootstrap({
        isUiStateReady: true,
        hasPersistedUiState: true,
        isCaseSubsetVisible: true,
        autoExpandedNodeIds: ['folder-a', 'folder-b'],
        setExpandedNodeIds,
      })
    );

    expect(setExpandedNodeIds).not.toHaveBeenCalled();
  });

  it('auto-expands once for first-time subset visibility and does not repeat on rerenders', () => {
    const setExpandedNodeIds = vi.fn();

    const { rerender } = renderHook(
      (props: {
        isUiStateReady: boolean;
        hasPersistedUiState: boolean;
        isCaseSubsetVisible: boolean;
        autoExpandedNodeIds: string[];
      }) =>
        useCaseListAutoExpandBootstrap({
          ...props,
          setExpandedNodeIds,
        }),
      {
        initialProps: {
          isUiStateReady: true,
          hasPersistedUiState: false,
          isCaseSubsetVisible: true,
          autoExpandedNodeIds: ['folder-a', 'folder-b'],
        },
      }
    );

    expect(setExpandedNodeIds).toHaveBeenCalledTimes(1);
    expect(setExpandedNodeIds).toHaveBeenCalledWith(['folder-a', 'folder-b']);

    rerender({
      isUiStateReady: true,
      hasPersistedUiState: false,
      isCaseSubsetVisible: true,
      autoExpandedNodeIds: ['folder-a', 'folder-b', 'folder-c'],
    });
    rerender({
      isUiStateReady: true,
      hasPersistedUiState: false,
      isCaseSubsetVisible: true,
      autoExpandedNodeIds: ['folder-x'],
    });

    expect(setExpandedNodeIds).toHaveBeenCalledTimes(1);
  });

  it('waits for ui state readiness before running bootstrap', () => {
    const setExpandedNodeIds = vi.fn();

    const { rerender } = renderHook(
      (props: {
        isUiStateReady: boolean;
        hasPersistedUiState: boolean;
        isCaseSubsetVisible: boolean;
        autoExpandedNodeIds: string[];
      }) =>
        useCaseListAutoExpandBootstrap({
          ...props,
          setExpandedNodeIds,
        }),
      {
        initialProps: {
          isUiStateReady: false,
          hasPersistedUiState: false,
          isCaseSubsetVisible: true,
          autoExpandedNodeIds: ['folder-a'],
        },
      }
    );

    expect(setExpandedNodeIds).not.toHaveBeenCalled();

    rerender({
      isUiStateReady: true,
      hasPersistedUiState: false,
      isCaseSubsetVisible: true,
      autoExpandedNodeIds: ['folder-a'],
    });

    expect(setExpandedNodeIds).toHaveBeenCalledTimes(1);
    expect(setExpandedNodeIds).toHaveBeenCalledWith(['folder-a']);
  });
});
