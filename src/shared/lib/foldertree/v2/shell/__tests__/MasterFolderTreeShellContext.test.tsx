// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  MasterFolderTreeShellProvider,
  useMasterFolderTreeShellContext,
  useOptionalMasterFolderTreeShellContext,
} from '@/shared/lib/foldertree/v2/shell/MasterFolderTreeShellContext';
import type { MasterFolderTreeShell } from '@/shared/lib/foldertree/v2/shell/useMasterFolderTreeShell';

const createShell = (): MasterFolderTreeShell =>
  ({
    applyDropToRoot: vi.fn(),
    clearRenameDraft: vi.fn(),
    collapseAll: vi.fn(),
    controller: {} as never,
    dropToRootState: 'idle',
    expandAll: vi.fn(),
    headerActions: [],
    isHydrated: true,
    isPanelCollapsed: false,
    isPersisting: false,
    persistNow: vi.fn(),
    renameDraft: '',
    rootDropTarget: null,
    setIsPanelCollapsed: vi.fn(),
    setRenameDraft: vi.fn(),
    setRootDropTarget: vi.fn(),
    tree: [] as never,
  }) as unknown as MasterFolderTreeShell;

describe('MasterFolderTreeShellContext', () => {
  it('throws outside the provider and returns null from the optional hook', () => {
    expect(() => renderHook(() => useMasterFolderTreeShellContext())).toThrow(
      'useMasterFolderTreeShellContext must be used within MasterFolderTreeShellProvider'
    );

    const optionalView = renderHook(() => useOptionalMasterFolderTreeShellContext());
    expect(optionalView.result.current).toBeNull();
  });

  it('returns the shell value inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MasterFolderTreeShellProvider value={createShell()}>{children}</MasterFolderTreeShellProvider>
    );

    const { result } = renderHook(
      () => ({
        optional: useOptionalMasterFolderTreeShellContext(),
        strict: useMasterFolderTreeShellContext(),
      }),
      { wrapper }
    );

    expect(result.current.strict.isHydrated).toBe(true);
    expect(result.current.strict.isPanelCollapsed).toBe(false);
    expect(result.current.strict.persistNow).toBeTypeOf('function');
    expect(result.current.optional).not.toBeNull();
  });
});
