'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { CaseResolverWorkspace, CaseResolverFile } from '@/shared/contracts/case-resolver';
import type { CaseResolverCaseListConfirmationState } from './types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '../../workspace-persistence';

import { waitForCaseAvailability } from './actions/case-availability';
import {
  handleCreateCaseImpl,
  handleUpdateCaseImpl,
  handleSaveCaseDraftImpl,
  handleDeleteCaseImpl,
} from './actions/case-crud';
import { handleMoveCaseImpl, handleReorderCaseImpl } from './actions/case-ordering';

export type ToastFn = (message: string, options?: { variant?: string }) => void;

type UseAdminCaseResolverCasesActionsArgs = {
  workspace: CaseResolverWorkspace;
  setWorkspace: Dispatch<SetStateAction<CaseResolverWorkspace>>;
  lastPersistedWorkspaceValueRef: MutableRefObject<string>;
  lastPersistedWorkspaceRevisionRef: MutableRefObject<number>;
  setIsCreatingCase: Dispatch<SetStateAction<boolean>>;
  createCaseMutationIdRef: MutableRefObject<string | null>;
  caseDraft: Partial<CaseResolverFile>;
  setCaseDraft: Dispatch<SetStateAction<Partial<CaseResolverFile>>>;
  setIsCreateCaseModalOpen: (open: boolean) => void;
  editingCaseId: string | null;
  setEditingCaseId: (id: string | null) => void;
  editingCaseName: string;
  editingCaseParentId: string | null;
  editingCaseReferenceCaseIds: string[];
  editingCaseTagId: string | null;
  editingCaseCaseIdentifierId: string | null;
  editingCaseCategoryId: string | null;
  setConfirmation: Dispatch<SetStateAction<CaseResolverCaseListConfirmationState>>;
  toast: ToastFn;
  settingsStoreRefetchRef: MutableRefObject<() => void>;
};

export function useAdminCaseResolverCasesActions(args: UseAdminCaseResolverCasesActionsArgs) {
  const { toast, setConfirmation } = args;

  const handleWaitForCaseAvailability = useCallback(
    async (caseId: string, options?: any) => waitForCaseAvailability(caseId, { ...args, options }),
    [args]
  );

  const handleCreateCase = useCallback(
    () => handleCreateCaseImpl({ ...args, toast }),
    [args, toast]
  );

  const handleUpdateCase = useCallback(
    () => handleUpdateCaseImpl({ ...args, toast }),
    [args, toast]
  );

  const handleSaveCaseDraft = useCallback(
    () => handleSaveCaseDraftImpl({ ...args, toast }),
    [args, toast]
  );

  const handleDeleteCaseLocal = useCallback(
    (caseId: string): void => {
      setConfirmation({
        title: 'Delete Case',
        message: 'Are you sure you want to delete this case? This action cannot be undone.',
        confirmText: 'Delete',
        isDangerous: true,
        onConfirm: () => handleDeleteCaseImpl({ ...args, caseId, toast, setConfirmation }),
      });
    },
    [args, toast, setConfirmation]
  );

  const handleMoveCase = useCallback(
    (caseId: string, targetParentCaseId: string | null, targetIndex?: number) =>
      handleMoveCaseImpl({ ...args, caseId, targetParentCaseId, targetIndex }),
    [args]
  );

  const handleReorderCase = useCallback(
    (caseId: string, targetCaseId: string, position: 'before' | 'after') =>
      handleReorderCaseImpl({ ...args, caseId, targetCaseId, position }),
    [args]
  );

  const handleRenameCase = useCallback(
    async (caseId: string, nextName: string): Promise<void> => {
      const normalizedCaseId = caseId.trim();
      const normalizedName = nextName.trim();
      if (!normalizedCaseId) return;
      if (!normalizedName) {
        toast('Case name is required.', { variant: 'error' });
        return;
      }

      const targetCase = args.workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === normalizedCaseId && file.fileType === 'case'
      );
      if (!targetCase || targetCase.name === normalizedName) return;

      try {
        const mutationId = createCaseResolverWorkspaceMutationId();
        const now = new Date().toISOString();
        const nextWorkspace: CaseResolverWorkspace = {
          ...args.workspace,
          files: args.workspace.files.map(
            (file: CaseResolverFile): CaseResolverFile =>
              file.id === normalizedCaseId && file.fileType === 'case'
                ? { ...file, name: normalizedName, updatedAt: now }
                : file
          ),
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        args.lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        args.lastPersistedWorkspaceRevisionRef.current = revision;
        args.setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_rename',
        });
      } catch (error) {
        logClientError(error, {
          context: { source: 'AdminCaseResolverCasesPage', action: 'renameCase', caseId },
        });
        toast('Failed to rename case.', { variant: 'error' });
      }
    },
    [args, toast]
  );

  const handleToggleCaseStatus = useCallback(
    async (caseId: string): Promise<void> => {
      const normalizedCaseId = caseId.trim();
      if (!normalizedCaseId) return;

      const targetCase = args.workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === normalizedCaseId && file.fileType === 'case'
      );
      if (!targetCase) return;

      const nextStatus: 'pending' | 'completed' =
        targetCase.caseStatus === 'completed' ? 'pending' : 'completed';

      try {
        const mutationId = createCaseResolverWorkspaceMutationId();
        const now = new Date().toISOString();
        const nextWorkspace: CaseResolverWorkspace = {
          ...args.workspace,
          files: args.workspace.files.map(
            (file: CaseResolverFile): CaseResolverFile =>
              file.id === normalizedCaseId && file.fileType === 'case'
                ? { ...file, caseStatus: nextStatus, updatedAt: now }
                : file
          ),
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        args.lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        args.lastPersistedWorkspaceRevisionRef.current = revision;
        args.setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_toggle_status',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'toggleCaseStatus',
            caseId,
          },
        });
        toast('Failed to update case status.', { variant: 'error' });
      }
    },
    [args, toast]
  );

  return {
    waitForCaseAvailability: handleWaitForCaseAvailability,
    handleCreateCase,
    handleUpdateCase,
    handleSaveCaseDraft,
    handleDeleteCase: handleDeleteCaseLocal,
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
    handleToggleCaseStatus,
  };
}
