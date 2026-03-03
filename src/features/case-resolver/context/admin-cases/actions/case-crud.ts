import type * as React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
 
/* eslint-disable @typescript-eslint/no-unsafe-call */
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { 
  CaseResolverWorkspace, 
  CaseResolverFile 
} from '@/shared/contracts/case-resolver';
import { 
  createCaseResolverWorkspaceMutationId, 
  stampCaseResolverWorkspaceMutation, 
  getCaseResolverWorkspaceRevision, 
  persistCaseResolverWorkspaceSnapshot,
} from '../../../workspace-persistence';
import { createCaseResolverFile } from '../../../settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { 
  isDescendantCaseId 
} from '../utils';
import { waitForCaseAvailability } from './case-availability';

export const handleCreateCaseImpl = async (args: {
  caseDraft: Partial<CaseResolverFile>;
  workspace: CaseResolverWorkspace;
  setWorkspace: (w: CaseResolverWorkspace) => void;
  lastPersistedWorkspaceValueRef: React.MutableRefObject<string>;
  lastPersistedWorkspaceRevisionRef: React.MutableRefObject<number>;
  createCaseMutationIdRef: React.MutableRefObject<string | null>;
  setIsCreatingCase: (val: boolean) => void;
  setIsCreateCaseModalOpen: (val: boolean) => void;
  setCaseDraft: (val: Partial<CaseResolverFile>) => void;
  setEditingCaseId: (id: string | null) => void;
  toast: any;
  settingsStoreRefetchRef: React.MutableRefObject<() => void>;
}): Promise<void> => {
  const { caseDraft, workspace, setWorkspace, lastPersistedWorkspaceValueRef, lastPersistedWorkspaceRevisionRef, createCaseMutationIdRef, setIsCreatingCase, setIsCreateCaseModalOpen, setCaseDraft, setEditingCaseId, toast, settingsStoreRefetchRef } = args;
  
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
          file.fileType === 'case' && (file.parentCaseId?.trim() || null) === parentCaseId
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
      name: (caseDraft.name).trim(),
      folder: caseDraft.folder || '',
      parentCaseId,
      caseStatus: caseDraft.caseStatus === 'completed' ? 'completed' : 'pending',
      caseTreeOrder: nextCaseTreeOrder,
      referenceCaseIds: caseDraft.referenceCaseIds || [],
      documentContent:
        typeof caseDraft.documentContent === 'string' ? caseDraft.documentContent : '',
      documentCity: typeof caseDraft.documentCity === 'string' ? caseDraft.documentCity : null,
      documentDate:
        typeof caseDraft.documentDate === 'string'
          ? caseDraft.documentDate
          : (caseDraft.documentDate ?? null),
      happeningDate: typeof caseDraft.happeningDate === 'string' ? caseDraft.happeningDate : null,
      activeDocumentVersion:
        caseDraft.activeDocumentVersion === 'exploded' ? 'exploded' : 'original',
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
      source: 'cases_page_create',
    });

    setIsCreateCaseModalOpen(false);
    setCaseDraft({});
    setEditingCaseId(null);
    toast('Case created successfully.', { variant: 'success' });

    void waitForCaseAvailability(newFile.id, { 
      lastPersistedWorkspaceRevisionRef, 
      lastPersistedWorkspaceValueRef, 
      setWorkspace, 
      settingsStoreRefetchRef,
      options: { source: 'cases_page_create_sync' } 
    });
  } catch (error) {
    logClientError(error, {
      context: { source: 'AdminCaseResolverCasesPage', action: 'createCase' },
    });
    toast('Failed to create case.', { variant: 'error' });
  } finally {
    setIsCreatingCase(false);
  }
};

export const handleSaveCaseDraftImpl = async (args: {
  editingCaseId: string | null;
  caseDraft: Partial<CaseResolverFile>;
  workspace: CaseResolverWorkspace;
  setWorkspace: (w: CaseResolverWorkspace) => void;
  lastPersistedWorkspaceValueRef: React.MutableRefObject<string>;
  lastPersistedWorkspaceRevisionRef: React.MutableRefObject<number>;
  createCaseMutationIdRef: React.MutableRefObject<string | null>;
  setIsCreatingCase: (val: boolean) => void;
  setIsCreateCaseModalOpen: (val: boolean) => void;
  setCaseDraft: (val: Partial<CaseResolverFile>) => void;
  setEditingCaseId: (id: string | null) => void;
  toast: any;
  settingsStoreRefetchRef: React.MutableRefObject<() => void>;
}): Promise<void> => {
  const { editingCaseId, caseDraft, workspace, setWorkspace, lastPersistedWorkspaceValueRef, lastPersistedWorkspaceRevisionRef, setIsCreatingCase, setIsCreateCaseModalOpen, setCaseDraft, setEditingCaseId, toast } = args;

  if (!editingCaseId) {
    await handleCreateCaseImpl(args);
    return;
  }

  const existingCase = workspace.files.find(
    (file: CaseResolverFile): boolean => file.id === editingCaseId && file.fileType === 'case'
  );
  if (!existingCase) {
    toast('Selected case no longer exists.', { variant: 'error' });
    return;
  }

  const resolvedName =
    typeof caseDraft.name === 'string' ? caseDraft.name.trim() : existingCase.name.trim();
  if (!resolvedName) {
    toast('Case name is required.', { variant: 'error' });
    return;
  }

  const caseFiles = workspace.files.filter(
    (file: CaseResolverFile): boolean => file.fileType === 'case'
  );
  const caseFilesById = new Map<string, CaseResolverFile>(
    caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
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
            referenceCaseId !== editingCaseId && caseFilesById.has(referenceCaseId)
        )
    )
  );

  const resolvedCaseStatus =
    caseDraft.caseStatus === 'completed' || caseDraft.caseStatus === 'pending'
      ? caseDraft.caseStatus
      : (existingCase as any).caseStatus === 'completed'
        ? 'completed'
        : 'pending';
  const resolvedFolder =
    typeof caseDraft.folder === 'string' ? caseDraft.folder : (existingCase.folder ?? '');
  const resolvedDocumentContent =
    typeof caseDraft.documentContent === 'string'
      ? caseDraft.documentContent
      : (existingCase.documentContent ?? '');
  const resolvedDocumentCity =
    typeof caseDraft.documentCity === 'string'
      ? caseDraft.documentCity
      : (existingCase.documentCity ?? null);
  const resolvedDocumentDate =
    caseDraft.documentDate !== undefined
      ? typeof caseDraft.documentDate === 'string'
        ? caseDraft.documentDate
        : (caseDraft.documentDate ?? null)
      : (existingCase.documentDate ?? null);
  const resolvedHappeningDate =
    caseDraft.happeningDate !== undefined
      ? typeof caseDraft.happeningDate === 'string'
        ? caseDraft.happeningDate
        : null
      : (existingCase.happeningDate ?? null);
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
      : (existingCase as any).isLocked === true;
  const resolvedIsSent =
    caseDraft.isSent !== undefined ? caseDraft.isSent === true : (existingCase as any).isSent === true;

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
};

export const handleUpdateCaseImpl = async (args: {
  editingCaseId: string | null;
  editingCaseName: string;
  editingCaseParentId: string | null;
  editingCaseReferenceCaseIds: string[];
  editingCaseTagId: string | null;
  editingCaseCaseIdentifierId: string | null;
  editingCaseCategoryId: string | null;
  workspace: CaseResolverWorkspace;
  setWorkspace: (w: CaseResolverWorkspace) => void;
  lastPersistedWorkspaceValueRef: React.MutableRefObject<string>;
  lastPersistedWorkspaceRevisionRef: React.MutableRefObject<number>;
  setEditingCaseId: (id: string | null) => void;
  toast: any;
}): Promise<void> => {
  const { editingCaseId, editingCaseName, editingCaseParentId, editingCaseReferenceCaseIds, editingCaseTagId, editingCaseCaseIdentifierId, editingCaseCategoryId, workspace, setWorkspace, lastPersistedWorkspaceValueRef, lastPersistedWorkspaceRevisionRef, setEditingCaseId, toast } = args;

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

    setEditingCaseId(null);
    toast('Case updated successfully.', { variant: 'success' });
  } catch (error) {
    logClientError(error, {
      context: { source: 'AdminCaseResolverCasesPage', action: 'updateCase' },
    });
    toast('Failed to update case.', { variant: 'error' });
  }
};

export const handleDeleteCaseImpl = async (args: {
  caseId: string;
  workspace: CaseResolverWorkspace;
  setWorkspace: (w: CaseResolverWorkspace) => void;
  lastPersistedWorkspaceValueRef: React.MutableRefObject<string>;
  lastPersistedWorkspaceRevisionRef: React.MutableRefObject<number>;
  editingCaseId: string | null;
  setEditingCaseId: (id: string | null) => void;
  toast: any;
  setConfirmation: (val: any) => void;
}): Promise<void> => {
  const { caseId, workspace, setWorkspace, lastPersistedWorkspaceValueRef, lastPersistedWorkspaceRevisionRef, editingCaseId, setEditingCaseId, toast, setConfirmation } = args;

  try {
    const mutationId = createCaseResolverWorkspaceMutationId();
    const nextWorkspace = {
      ...workspace,
      files: workspace.files.filter((file) => file.id !== caseId),
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
      source: 'cases_page_delete',
    });
    if (editingCaseId === caseId) {
      setEditingCaseId(null);
    }
    toast('Case deleted successfully.', { variant: 'success' });
  } catch (error) {
    logClientError(error, {
      context: { source: 'AdminCaseResolverCasesPage', action: 'deleteCase' },
    });
    toast('Failed to delete case.', { variant: 'error' });
  } finally {
    setConfirmation(null);
  }
};
