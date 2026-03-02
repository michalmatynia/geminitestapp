import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultCaseResolverWorkspace } from '@/features/case-resolver/settings';
import { serializeWorkspaceForUnsavedChangesCheck } from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import { useCaseResolverStateWorkspaceMutations } from '@/features/case-resolver/hooks/useCaseResolverState.workspace-mutations';
import {
  getCaseResolverWorkspaceRevision,
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
} from '@/features/case-resolver/workspace-persistence';
import type { UseCaseResolverPersistenceValue } from '@/features/case-resolver/hooks/useCaseResolverState.persistence-actions';

describe('useCaseResolverStateWorkspaceMutations', () => {
  it('primes the navigation cache with the latest stamped workspace', () => {
    const initialWorkspace = createDefaultCaseResolverWorkspace();
    primeCaseResolverNavigationWorkspace(initialWorkspace);

    const enqueueWorkspacePersistMutation = vi.fn();
    const flushWorkspacePersist = vi.fn();
    const persistence = {
      queuedExpectedRevisionRef: { current: null },
      lastPersistedRevisionRef: { current: getCaseResolverWorkspaceRevision(initialWorkspace) },
      pendingSaveToastRef: { current: null },
      enqueueWorkspacePersistMutation,
      flushWorkspacePersist,
      clearConflictRetryTimer: vi.fn(),
      persistWorkspaceTimerRef: { current: null },
      isWorkspaceSaving: false,
      setWorkspaceSaveStatus: vi.fn(),
      setWorkspaceSaveError: vi.fn(),
    } as unknown as UseCaseResolverPersistenceValue;

    const { result } = renderHook(() => {
      const [workspace, setWorkspace] = useState(initialWorkspace);
      const persistedWorkspaceComparableSnapshotRef = useRef(
        serializeWorkspaceForUnsavedChangesCheck(initialWorkspace)
      );
      return useCaseResolverStateWorkspaceMutations({
        workspace,
        setWorkspace,
        persistedWorkspaceComparableSnapshot: persistedWorkspaceComparableSnapshotRef.current,
        persistence,
      });
    });

    act(() => {
      result.current.updateWorkspace((current) => ({
        ...current,
        folders: ['new-folder'],
        folderRecords: [{ path: 'new-folder', ownerCaseId: 'case-a' }],
      }));
    });

    expect(enqueueWorkspacePersistMutation).toHaveBeenCalledTimes(1);
    expect(readCaseResolverNavigationWorkspace()).toMatchObject({
      folders: ['new-folder'],
      folderRecords: [{ path: 'new-folder', ownerCaseId: null }],
      workspaceRevision: 1,
    });
  });
});
