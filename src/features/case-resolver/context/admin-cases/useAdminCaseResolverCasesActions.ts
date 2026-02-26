'use client';

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { 
  CaseResolverWorkspace, 
  CaseResolverFile 
} from '@/shared/contracts/case-resolver';
import { 
  createCaseResolverWorkspaceMutationId, 
  fetchCaseResolverWorkspaceSnapshot, 
  getCaseResolverWorkspaceRevision, 
  logCaseResolverWorkspaceEvent, 
  persistCaseResolverWorkspaceSnapshot, 
  stampCaseResolverWorkspaceMutation 
} from '../../workspace-persistence';
import { 
  CASE_RESOLVER_CASE_READY_MAX_ATTEMPTS, 
  CASE_RESOLVER_CASE_READY_INTERVAL_MS,
  normalizeCaseParentId,
  getSortedSiblingIds,
  assignSiblingCaseOrder,
  isDescendantCaseId
} from './utils';
import { createCaseResolverFile } from '../../settings';
import { logClientError } from '@/features/observability';
import type { CaseResolverCaseListConfirmationState } from './types';

type ToastFn = (message: string, options?: { variant?: string }) => void;

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

export function useAdminCaseResolverCasesActions({
  workspace,
  setWorkspace,
  lastPersistedWorkspaceValueRef,
  lastPersistedWorkspaceRevisionRef,
  setIsCreatingCase,
  createCaseMutationIdRef,
  caseDraft,
  setCaseDraft,
  setIsCreateCaseModalOpen,
  editingCaseId,
  setEditingCaseId,
  editingCaseName,
  editingCaseParentId,
  editingCaseReferenceCaseIds,
  editingCaseTagId,
  editingCaseCaseIdentifierId,
  editingCaseCategoryId,
  setConfirmation,
  toast,
  settingsStoreRefetchRef,
}: UseAdminCaseResolverCasesActionsArgs) {
  const waitForCaseAvailability = useCallback(
    async (
      caseId: string,
      options?: {
        source?: string;
        maxAttempts?: number;
        intervalMs?: number;
      },
    ): Promise<boolean> => {
      const source = options?.source ?? 'cases_page_case_sync';
      const maxAttempts =
        options?.maxAttempts ?? CASE_RESOLVER_CASE_READY_MAX_ATTEMPTS;
      const intervalMs =
        options?.intervalMs ?? CASE_RESOLVER_CASE_READY_INTERVAL_MS;
      const wait = async (ms: number): Promise<void> =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, ms);
        });

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const snapshot = await fetchCaseResolverWorkspaceSnapshot(source);
        if (snapshot) {
          const hasCase = snapshot.files.some(
            (file: CaseResolverFile): boolean =>
              file.id === caseId && file.fileType === 'case',
          );
          if (hasCase) {
            const serialized = JSON.stringify(snapshot);
            const revision = getCaseResolverWorkspaceRevision(snapshot);
            if (revision >= lastPersistedWorkspaceRevisionRef.current) {
              lastPersistedWorkspaceValueRef.current = serialized;
              lastPersistedWorkspaceRevisionRef.current = revision;
              setWorkspace(snapshot);
            }
            settingsStoreRefetchRef.current();
            logCaseResolverWorkspaceEvent({
              source,
              action: 'case_availability_confirmed',
              workspaceRevision: revision,
            });
            return true;
          }
        }

        if (attempt === 0) {
          settingsStoreRefetchRef.current();
        }
        if (attempt < maxAttempts - 1) {
          await wait(intervalMs);
        }
      }

      logCaseResolverWorkspaceEvent({
        source,
        action: 'case_availability_missing',
        message: `Case was not visible after sync attempts: ${caseId}`,
      });
      return false;
    },
    [lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace, settingsStoreRefetchRef],
  );

  const handleCreateCase = useCallback(async (): Promise<void> => {
    if (!caseDraft.name?.trim()) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }
    setIsCreatingCase(true);
    try {
      const mutationId = createCaseResolverWorkspaceMutationId();
      createCaseMutationIdRef.current = mutationId;
      const parentCaseId = caseDraft.parentCaseId?.trim() || null;
      const siblingCaseOrders = workspace.files
        .filter(
          (file: CaseResolverFile): boolean =>
            file.fileType === 'case' &&
            (file.parentCaseId?.trim() || null) === parentCaseId
        )
        .map((file: CaseResolverFile): number =>
          typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
            ? Math.max(0, Math.floor(file.caseTreeOrder))
            : -1
        );
      const nextCaseTreeOrder =
        siblingCaseOrders.length > 0 ? Math.max(...siblingCaseOrders) + 1 : 0;
      const newFile = createCaseResolverFile({
        id: createCaseResolverWorkspaceMutationId('file'),
        fileType: 'case',
        name: caseDraft.name.trim(),
        folder: caseDraft.folder || '',
        parentCaseId,
        caseStatus: caseDraft.caseStatus === 'completed' ? 'completed' : 'pending',
        caseTreeOrder: nextCaseTreeOrder,
        referenceCaseIds: caseDraft.referenceCaseIds || [],
        documentContent:
          typeof caseDraft.documentContent === 'string'
            ? caseDraft.documentContent
            : '',
        documentCity:
          typeof caseDraft.documentCity === 'string'
            ? caseDraft.documentCity
            : null,
        documentDate:
          typeof caseDraft.documentDate === 'string'
            ? caseDraft.documentDate
            : caseDraft.documentDate ?? null,
        happeningDate:
          typeof caseDraft.happeningDate === 'string'
            ? caseDraft.happeningDate
            : null,
        activeDocumentVersion:
          caseDraft.activeDocumentVersion === 'exploded'
            ? 'exploded'
            : 'original',
        isLocked: caseDraft.isLocked === true,
        isSent: caseDraft.isSent === true,
        tagId: caseDraft.tagId || null,
        caseIdentifierId: caseDraft.caseIdentifierId || null,
        categoryId: caseDraft.categoryId || null,
      });

      const nextWorkspace = {
        ...workspace,
        files: [...workspace.files, newFile],
      };
      stampCaseResolverWorkspaceMutation(nextWorkspace, { baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace), mutationId });

      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot({ workspace: nextWorkspace, expectedRevision: revision, mutationId, source: 'cases_page_create' });
      
      setIsCreateCaseModalOpen(false);
      setCaseDraft({});
      setEditingCaseId(null);
      toast('Case created successfully.', { variant: 'success' });
      
      void waitForCaseAvailability(newFile.id, { source: 'cases_page_create_sync' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'createCase' } });
      toast('Failed to create case.', { variant: 'error' });
    } finally {
      setIsCreatingCase(false);
    }
  }, [caseDraft, toast, waitForCaseAvailability, workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace, createCaseMutationIdRef, setIsCreatingCase, setIsCreateCaseModalOpen, setCaseDraft, setEditingCaseId]);

  const handleUpdateCase = useCallback(async (): Promise<void> => {
    if (!editingCaseId || !editingCaseName.trim()) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }
    try {
      const mutationId = createCaseResolverWorkspaceMutationId();
      const nextWorkspace = {
        ...workspace,
        files: workspace.files.map((file) =>
          file.id === editingCaseId
            ? {
              ...file,
              name: editingCaseName.trim(),
              parentCaseId: editingCaseParentId,
              referenceCaseIds: editingCaseReferenceCaseIds,
              tagId: editingCaseTagId,
              caseIdentifierId: editingCaseCaseIdentifierId,
              categoryId: editingCaseCategoryId,
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
      };
      stampCaseResolverWorkspaceMutation(nextWorkspace, { baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace), mutationId });

      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot({ workspace: nextWorkspace, expectedRevision: revision, mutationId, source: 'cases_page_update' });
      
      setEditingCaseId(null);
      toast('Case updated successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'updateCase' } });
      toast('Failed to update case.', { variant: 'error' });
    }
  }, [editingCaseId, editingCaseName, editingCaseParentId, editingCaseReferenceCaseIds, editingCaseTagId, editingCaseCaseIdentifierId, editingCaseCategoryId, toast, workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace, setEditingCaseId]);

  const handleSaveCaseDraft = useCallback(async (): Promise<void> => {
    if (!editingCaseId) {
      await handleCreateCase();
      return;
    }

    const existingCase = workspace.files.find(
      (file: CaseResolverFile): boolean =>
        file.id === editingCaseId && file.fileType === 'case',
    );
    if (!existingCase) {
      toast('Selected case no longer exists.', { variant: 'error' });
      return;
    }

    const resolvedName =
      typeof caseDraft.name === 'string'
        ? caseDraft.name.trim()
        : existingCase.name.trim();
    if (!resolvedName) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }

    const caseFiles = workspace.files.filter(
      (file: CaseResolverFile): boolean => file.fileType === 'case',
    );
    const caseFilesById = new Map<string, CaseResolverFile>(
      caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [
        file.id,
        file,
      ]),
    );
    const normalizeOptionalCaseId = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    };

    const requestedParentCaseId =
      caseDraft.parentCaseId !== undefined
        ? normalizeOptionalCaseId(caseDraft.parentCaseId)
        : normalizeOptionalCaseId(existingCase.parentCaseId);
    const normalizedParentCaseId =
      requestedParentCaseId &&
      requestedParentCaseId !== editingCaseId &&
      caseFilesById.has(requestedParentCaseId)
        ? requestedParentCaseId
        : null;
    if (
      normalizedParentCaseId &&
      isDescendantCaseId(caseFilesById, normalizedParentCaseId, editingCaseId)
    ) {
      toast('A case cannot be moved under one of its descendants.', {
        variant: 'error',
      });
      return;
    }

    const sourceReferenceCaseIds = Array.isArray(caseDraft.referenceCaseIds)
      ? caseDraft.referenceCaseIds
      : existingCase.referenceCaseIds;
    const normalizedReferenceCaseIds = Array.from(
      new Set(
        sourceReferenceCaseIds
          .map((referenceCaseId: string): string => referenceCaseId.trim())
          .filter((referenceCaseId: string): boolean => referenceCaseId.length > 0)
          .filter(
            (referenceCaseId: string): boolean =>
              referenceCaseId !== editingCaseId && caseFilesById.has(referenceCaseId),
          ),
      ),
    );

    const resolvedCaseStatus =
      caseDraft.caseStatus === 'completed' || caseDraft.caseStatus === 'pending'
        ? caseDraft.caseStatus
        : existingCase.caseStatus === 'completed'
          ? 'completed'
          : 'pending';
    const resolvedFolder =
      typeof caseDraft.folder === 'string'
        ? caseDraft.folder
        : existingCase.folder ?? '';
    const resolvedDocumentContent =
      typeof caseDraft.documentContent === 'string'
        ? caseDraft.documentContent
        : existingCase.documentContent ?? '';
    const resolvedDocumentCity =
      typeof caseDraft.documentCity === 'string'
        ? caseDraft.documentCity
        : existingCase.documentCity ?? null;
    const resolvedDocumentDate =
      caseDraft.documentDate !== undefined
        ? typeof caseDraft.documentDate === 'string'
          ? caseDraft.documentDate
          : caseDraft.documentDate ?? null
        : existingCase.documentDate ?? null;
    const resolvedHappeningDate =
      caseDraft.happeningDate !== undefined
        ? typeof caseDraft.happeningDate === 'string'
          ? caseDraft.happeningDate
          : null
        : existingCase.happeningDate ?? null;
    const resolvedDocumentVersion =
      caseDraft.activeDocumentVersion === 'exploded' ||
      caseDraft.activeDocumentVersion === 'original'
        ? caseDraft.activeDocumentVersion
        : existingCase.activeDocumentVersion === 'exploded'
          ? 'exploded'
          : 'original';
    const resolvedTagId =
      caseDraft.tagId !== undefined
        ? normalizeOptionalCaseId(caseDraft.tagId)
        : normalizeOptionalCaseId(existingCase.tagId);
    const resolvedCaseIdentifierId =
      caseDraft.caseIdentifierId !== undefined
        ? normalizeOptionalCaseId(caseDraft.caseIdentifierId)
        : normalizeOptionalCaseId(existingCase.caseIdentifierId);
    const resolvedCategoryId =
      caseDraft.categoryId !== undefined
        ? normalizeOptionalCaseId(caseDraft.categoryId)
        : normalizeOptionalCaseId(existingCase.categoryId);
    const resolvedIsLocked =
      caseDraft.isLocked !== undefined
        ? caseDraft.isLocked === true
        : existingCase.isLocked === true;
    const resolvedIsSent =
      caseDraft.isSent !== undefined
        ? caseDraft.isSent === true
        : existingCase.isSent === true;

    setIsCreatingCase(true);
    try {
      const mutationId = createCaseResolverWorkspaceMutationId();
      const now = new Date().toISOString();
      const nextWorkspace: CaseResolverWorkspace = {
        ...workspace,
        files: workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
          if (file.id !== editingCaseId || file.fileType !== 'case') return file;
          return createCaseResolverFile({
            ...file,
            id: file.id,
            fileType: 'case',
            name: resolvedName,
            folder: resolvedFolder,
            parentCaseId: normalizedParentCaseId,
            caseStatus: resolvedCaseStatus,
            referenceCaseIds: normalizedReferenceCaseIds,
            documentContent: resolvedDocumentContent,
            documentCity: resolvedDocumentCity,
            documentDate: resolvedDocumentDate,
            happeningDate: resolvedHappeningDate,
            activeDocumentVersion: resolvedDocumentVersion,
            isLocked: resolvedIsLocked,
            isSent: resolvedIsSent,
            tagId: resolvedTagId,
            caseIdentifierId: resolvedCaseIdentifierId,
            categoryId: resolvedCategoryId,
            createdAt: file.createdAt,
            updatedAt: now,
          });
        }),
      };
      stampCaseResolverWorkspaceMutation(nextWorkspace, {
        baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
        mutationId,
      });

      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot({
        workspace: nextWorkspace,
        expectedRevision: revision,
        mutationId,
        source: 'cases_page_update',
      });

      setIsCreateCaseModalOpen(false);
      setCaseDraft({});
      setEditingCaseId(null);
      toast('Case updated successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminCaseResolverCasesPage', action: 'saveCaseDraft' },
      });
      toast('Failed to save case.', { variant: 'error' });
    } finally {
      setIsCreatingCase(false);
    }
  }, [caseDraft, editingCaseId, handleCreateCase, toast, workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace, setIsCreatingCase, setIsCreateCaseModalOpen, setCaseDraft, setEditingCaseId]);

  const handleDeleteCaseLocal = useCallback((caseId: string): void => {
    setConfirmation({
      title: 'Delete Case',
      message: 'Are you sure you want to delete this case? This action cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const mutationId = createCaseResolverWorkspaceMutationId();
          const nextWorkspace = {
            ...workspace,
            files: workspace.files.filter((file) => file.id !== caseId),
          };
          stampCaseResolverWorkspaceMutation(nextWorkspace, { baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace), mutationId });

          const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
          lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
          lastPersistedWorkspaceRevisionRef.current = revision;
          setWorkspace(nextWorkspace);

          await persistCaseResolverWorkspaceSnapshot({ workspace: nextWorkspace, expectedRevision: revision, mutationId, source: 'cases_page_delete' });
          toast('Case deleted successfully.', { variant: 'success' });
        } catch (error) {
          logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'deleteCase' } });
          toast('Failed to delete case.', { variant: 'error' });
        } finally {
          setConfirmation(null);
        }
      },
    });
  }, [toast, workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace, setConfirmation]);

  const handleMoveCase = useCallback(
    async (
      caseId: string,
      targetParentCaseId: string | null,
      targetIndex?: number
    ): Promise<void> => {
      try {
        const caseFilesById = new Map<string, CaseResolverFile>(
          workspace.files
            .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
            .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, { ...file }])
        );
        const movingCase = caseFilesById.get(caseId);
        if (!movingCase || movingCase.isLocked) return;

        const sourceParentCaseId = normalizeCaseParentId(movingCase, caseFilesById);
        const requestedParentCaseId = targetParentCaseId?.trim() ?? '';
        const normalizedTargetParentCaseId =
          requestedParentCaseId.length > 0 &&
          requestedParentCaseId !== caseId &&
          caseFilesById.has(requestedParentCaseId)
            ? requestedParentCaseId
            : null;

        if (
          normalizedTargetParentCaseId &&
          isDescendantCaseId(caseFilesById, normalizedTargetParentCaseId, caseId)
        ) {
          return;
        }

        movingCase.parentCaseId = normalizedTargetParentCaseId;
        const targetSiblingIds = getSortedSiblingIds(caseFilesById, normalizedTargetParentCaseId, {
          excludeCaseId: caseId,
        });
        const normalizedTargetIndex =
          typeof targetIndex === 'number' && Number.isFinite(targetIndex)
            ? Math.max(0, Math.min(Math.floor(targetIndex), targetSiblingIds.length))
            : targetSiblingIds.length;
        const nextTargetSiblingIds = [...targetSiblingIds];
        nextTargetSiblingIds.splice(normalizedTargetIndex, 0, caseId);
        assignSiblingCaseOrder(caseFilesById, nextTargetSiblingIds);

        if (sourceParentCaseId !== normalizedTargetParentCaseId) {
          const sourceSiblingIds = getSortedSiblingIds(caseFilesById, sourceParentCaseId, {
            excludeCaseId: caseId,
          });
          assignSiblingCaseOrder(caseFilesById, sourceSiblingIds);
        }

        const now = new Date().toISOString();
        const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
          if (file.fileType !== 'case') return file;
          const nextCase = caseFilesById.get(file.id);
          if (!nextCase) return file;

          const previousParentCaseId = file.parentCaseId?.trim() ?? null;
          const nextParentCaseId = normalizeCaseParentId(nextCase, caseFilesById);
          const previousCaseTreeOrder =
            typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
              ? Math.max(0, Math.floor(file.caseTreeOrder))
              : null;
          const nextCaseTreeOrder =
            typeof nextCase.caseTreeOrder === 'number' && Number.isFinite(nextCase.caseTreeOrder)
              ? Math.max(0, Math.floor(nextCase.caseTreeOrder))
              : null;

          const didChangeParent = previousParentCaseId !== nextParentCaseId;
          const didChangeOrder = previousCaseTreeOrder !== nextCaseTreeOrder;
          if (!didChangeParent && !didChangeOrder) return file;

          return {
            ...file,
            parentCaseId: nextParentCaseId,
            caseTreeOrder: nextCaseTreeOrder ?? undefined,
            updatedAt: now,
          };
        });

        const mutationId = createCaseResolverWorkspaceMutationId();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: nextFiles,
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_move_case',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'moveCase',
            caseId,
            targetParentCaseId,
          },
        });
        throw error;
      }
    },
    [workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace]
  );

  const handleReorderCase = useCallback(
    async (caseId: string, targetCaseId: string, position: 'before' | 'after'): Promise<void> => {
      try {
        if (caseId === targetCaseId) return;

        const caseFilesById = new Map<string, CaseResolverFile>(
          workspace.files
            .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
            .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, { ...file }])
        );
        const movingCase = caseFilesById.get(caseId);
        const targetCase = caseFilesById.get(targetCaseId);
        if (!movingCase || !targetCase || movingCase.isLocked) return;

        const sourceParentCaseId = normalizeCaseParentId(movingCase, caseFilesById);
        const targetParentCaseId = normalizeCaseParentId(targetCase, caseFilesById);
        if (targetParentCaseId && isDescendantCaseId(caseFilesById, targetParentCaseId, caseId)) {
          return;
        }

        movingCase.parentCaseId = targetParentCaseId;
        const targetSiblingIds = getSortedSiblingIds(caseFilesById, targetParentCaseId, {
          excludeCaseId: caseId,
        });
        const targetIndex = targetSiblingIds.indexOf(targetCaseId);
        if (targetIndex < 0) return;
        const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
        const nextTargetSiblingIds = [...targetSiblingIds];
        nextTargetSiblingIds.splice(insertIndex, 0, caseId);
        assignSiblingCaseOrder(caseFilesById, nextTargetSiblingIds);

        if (sourceParentCaseId !== targetParentCaseId) {
          const sourceSiblingIds = getSortedSiblingIds(caseFilesById, sourceParentCaseId, {
            excludeCaseId: caseId,
          });
          assignSiblingCaseOrder(caseFilesById, sourceSiblingIds);
        }

        const now = new Date().toISOString();
        const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
          if (file.fileType !== 'case') return file;
          const nextCase = caseFilesById.get(file.id);
          if (!nextCase) return file;

          const previousParentCaseId = file.parentCaseId?.trim() ?? null;
          const nextParentCaseId = normalizeCaseParentId(nextCase, caseFilesById);
          const previousCaseTreeOrder =
            typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
              ? Math.max(0, Math.floor(file.caseTreeOrder))
              : null;
          const nextCaseTreeOrder =
            typeof nextCase.caseTreeOrder === 'number' && Number.isFinite(nextCase.caseTreeOrder)
              ? Math.max(0, Math.floor(nextCase.caseTreeOrder))
              : null;

          const didChangeParent = previousParentCaseId !== nextParentCaseId;
          const didChangeOrder = previousCaseTreeOrder !== nextCaseTreeOrder;
          if (!didChangeParent && !didChangeOrder) return file;

          return {
            ...file,
            parentCaseId: nextParentCaseId,
            caseTreeOrder: nextCaseTreeOrder ?? undefined,
            updatedAt: now,
          };
        });

        const mutationId = createCaseResolverWorkspaceMutationId();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: nextFiles,
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_reorder_case',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'reorderCase',
            caseId,
            targetCaseId,
            position,
          },
        });
        throw error;
      }
    },
    [workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace]
  );

  const handleRenameCase = useCallback(
    async (caseId: string, nextName: string): Promise<void> => {
      const normalizedName = nextName.trim();
      if (!normalizedName) return;

      const targetCase = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === caseId && file.fileType === 'case'
      );
      if (!targetCase || targetCase.isLocked || targetCase.name === normalizedName) return;

      try {
        const now = new Date().toISOString();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: workspace.files.map((file: CaseResolverFile): CaseResolverFile =>
            file.id === caseId
              ? {
                ...file,
                name: normalizedName,
                updatedAt: now,
              }
              : file
          ),
        };

        const mutationId = createCaseResolverWorkspaceMutationId();
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_rename_case',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'renameCase',
            caseId,
          },
        });
        throw error;
      }
    },
    [workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace]
  );

  const handleToggleCaseStatus = useCallback(
    async (caseId: string): Promise<void> => {
      const targetCase = workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === caseId && file.fileType === 'case',
      );
      if (!targetCase || targetCase.isLocked) return;

      const nextStatus =
        targetCase.caseStatus === 'completed' ? 'pending' : 'completed';
      const now = new Date().toISOString();

      try {
        const mutationId = createCaseResolverWorkspaceMutationId();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: workspace.files.map((file: CaseResolverFile): CaseResolverFile =>
            file.id === caseId && file.fileType === 'case'
              ? {
                ...file,
                caseStatus: nextStatus,
                updatedAt: now,
              }
              : file,
          ),
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

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
    [toast, workspace, lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace],
  );

  return {
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
