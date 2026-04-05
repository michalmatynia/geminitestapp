import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCaseResolverStateViewState } from '@/features/case-resolver/hooks/useCaseResolverState.view-state';
import {
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

describe('useCaseResolverStateViewState', () => {
  it('preserves case context when a selected folder is deactivated', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-zus',
      fileType: 'case',
      name: 'ZUS',
    });

    const initialWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [caseFile],
      folderRecords: [{ path: 'zus/outgoing', ownerCaseId: caseFile.id }],
      activeFileId: null,
    };

    const handledRequestedFileIdRef = { current: null as string | null };
    const clearQueuedWorkspacePersistMutation = vi.fn();
    const syncPersistedWorkspaceTracking = vi.fn();

    const { result } = renderHook(() => {
      const [workspace, setWorkspace] = React.useState<CaseResolverWorkspace>(initialWorkspace);
      return {
        workspace,
        viewState: useCaseResolverStateViewState({
          workspace,
          setWorkspace,
          requestedFileId: null,
          requestedCaseStatus: 'ready',
          initialWorkspaceState: initialWorkspace,
          syncPersistedWorkspaceTracking,
          clearQueuedWorkspacePersistMutation,
          handledRequestedFileIdRef,
        }),
      };
    });

    act(() => {
      result.current.viewState.handleSelectFolder('zus/outgoing');
    });

    expect(result.current.viewState.activeCaseId).toBe(caseFile.id);
    expect(result.current.workspace.activeFileId).toBe(caseFile.id);
    expect(result.current.viewState.selectedFolderPath).toBe('zus/outgoing');

    act(() => {
      result.current.viewState.handleSelectFolder('zus/outgoing');
    });

    expect(result.current.viewState.selectedFolderPath).toBeNull();
    expect(result.current.viewState.activeCaseId).toBe(caseFile.id);
    expect(result.current.workspace.activeFileId).toBe(caseFile.id);
  });

  it('syncs an existing requested file into selection and workspace state once', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-zus',
      fileType: 'case',
      name: 'ZUS',
    });

    const initialWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [caseFile],
      activeFileId: null,
    };

    const handledRequestedFileIdRef = { current: null as string | null };
    const clearQueuedWorkspacePersistMutation = vi.fn();
    const syncPersistedWorkspaceTracking = vi.fn();

    const { result, rerender } = renderHook(
      ({ requestedFileId }: { requestedFileId: string | null }) => {
        const [workspace, setWorkspace] = React.useState<CaseResolverWorkspace>(initialWorkspace);
        return {
          workspace,
          viewState: useCaseResolverStateViewState({
            workspace,
            setWorkspace,
            requestedFileId,
            requestedCaseStatus: 'ready',
            initialWorkspaceState: initialWorkspace,
            syncPersistedWorkspaceTracking,
            clearQueuedWorkspacePersistMutation,
            handledRequestedFileIdRef,
          }),
        };
      },
      {
        initialProps: {
          requestedFileId: caseFile.id,
        },
      }
    );

    expect(result.current.viewState.selectedFileId).toBe(caseFile.id);
    expect(result.current.workspace.activeFileId).toBe(caseFile.id);
    expect(handledRequestedFileIdRef.current).toBe(caseFile.id);
    expect(syncPersistedWorkspaceTracking).toHaveBeenCalledTimes(1);
    expect(syncPersistedWorkspaceTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        activeFileId: caseFile.id,
      })
    );
    expect(clearQueuedWorkspacePersistMutation).toHaveBeenCalledTimes(1);

    rerender({ requestedFileId: caseFile.id });

    expect(syncPersistedWorkspaceTracking).toHaveBeenCalledTimes(1);
    expect(clearQueuedWorkspacePersistMutation).toHaveBeenCalledTimes(1);
  });

  it('clears active workspace state when a requested file is missing from the workspace', () => {
    const existingFile = createCaseResolverFile({
      id: 'case-zus',
      fileType: 'case',
      name: 'ZUS',
    });

    const initialWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [existingFile],
      activeFileId: existingFile.id,
    };

    const handledRequestedFileIdRef = { current: null as string | null };
    const clearQueuedWorkspacePersistMutation = vi.fn();
    const syncPersistedWorkspaceTracking = vi.fn();

    const { result } = renderHook(() => {
      const [workspace, setWorkspace] = React.useState<CaseResolverWorkspace>(initialWorkspace);
      return {
        workspace,
        viewState: useCaseResolverStateViewState({
          workspace,
          setWorkspace,
          requestedFileId: 'missing-file',
          requestedCaseStatus: 'ready',
          initialWorkspaceState: initialWorkspace,
          syncPersistedWorkspaceTracking,
          clearQueuedWorkspacePersistMutation,
          handledRequestedFileIdRef,
        }),
      };
    });

    expect(result.current.viewState.selectedFileId).toBe('missing-file');
    expect(result.current.workspace.activeFileId).toBeNull();
    expect(handledRequestedFileIdRef.current).toBeNull();
    expect(syncPersistedWorkspaceTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        activeFileId: null,
      })
    );
    expect(clearQueuedWorkspacePersistMutation).toHaveBeenCalledTimes(1);
  });
});
