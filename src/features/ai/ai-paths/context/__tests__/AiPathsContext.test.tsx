// @vitest-environment jsdom

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AiPathsProvider, useAiPaths, useAiPathsActions, useAiPathsState } from '../AiPathsContext';

const mocks = vi.hoisted(() => ({
  setIsMenuHidden: vi.fn(),
}));

vi.mock('@/shared/providers/AdminLayoutProvider', () => ({
  useAdminLayoutActions: () => ({
    setIsMenuHidden: mocks.setIsMenuHidden,
  }),
}));

describe('AiPathsContext', () => {
  afterEach(() => {
    mocks.setIsMenuHidden.mockReset();
  });

  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useAiPathsState())).toThrow(
      'useAiPathsState must be used within an AiPathsProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useAiPathsActions())).toThrow(
      'useAiPathsActions must be used within an AiPathsProvider'
    );
  });

  it('updates focus mode state and admin menu visibility inside the provider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AiPathsProvider>{children}</AiPathsProvider>
    );

    const { result, unmount } = renderHook(() => useAiPaths(), { wrapper });

    expect(result.current.activeTab).toBe('canvas');
    expect(result.current.isFocusMode).toBe(false);
    expect(result.current.mounted).toBe(false);
    expect(mocks.setIsMenuHidden).toHaveBeenCalledWith(false);

    await waitFor(() => {
      expect(result.current.mounted).toBe(true);
    });

    act(() => {
      result.current.onToggleFocusMode();
    });

    expect(result.current.isFocusMode).toBe(true);
    expect(mocks.setIsMenuHidden).toHaveBeenLastCalledWith(true);

    act(() => {
      result.current.setActiveTab('paths');
    });

    expect(result.current.activeTab).toBe('paths');
    expect(mocks.setIsMenuHidden).toHaveBeenLastCalledWith(false);

    act(() => {
      result.current.setActiveTab('canvas');
      result.current.setIsFocusMode(false);
    });

    expect(result.current.activeTab).toBe('canvas');
    expect(result.current.isFocusMode).toBe(false);
    expect(mocks.setIsMenuHidden).toHaveBeenLastCalledWith(false);

    unmount();

    expect(mocks.setIsMenuHidden).toHaveBeenLastCalledWith(false);
  });
});
