'use client';

 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
 
/* eslint-disable @typescript-eslint/no-unsafe-call */
 
 

import { 
  CaseResolverWorkspace, 
  CaseResolverFile 
} from '@/shared/contracts/case-resolver';
import { 
  createCaseResolverWorkspaceMutationId, 
  stampCaseResolverWorkspaceMutation, 
  getCaseResolverWorkspaceRevision, 
  persistCaseResolverWorkspaceSnapshot 
} from '../../../workspace-persistence';
import { 
  normalizeCaseParentId, 
  getSortedSiblingIds, 
  assignSiblingCaseOrder, 
  isDescendantCaseId 
} from '../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const handleMoveCaseImpl = async (args: {
  caseId: string;
  targetParentCaseId: string | null;
  targetIndex?: number;
  workspace: CaseResolverWorkspace;
  setWorkspace: (w: CaseResolverWorkspace) => void;
  lastPersistedWorkspaceValueRef: React.MutableRefObject<string>;
  lastPersistedWorkspaceRevisionRef: React.MutableRefObject<number>;
}): Promise<void> => {
  const { caseId, targetParentCaseId, targetIndex, workspace, setWorkspace, lastPersistedWorkspaceValueRef, lastPersistedWorkspaceRevisionRef } = args;

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

      const previousParentCaseId = (file.parentCaseId ?? '').trim() || null;
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
};

export const handleReorderCaseImpl = async (args: {
  caseId: string;
  targetCaseId: string;
  position: 'before' | 'after';
  workspace: CaseResolverWorkspace;
  setWorkspace: (w: CaseResolverWorkspace) => void;
  lastPersistedWorkspaceValueRef: React.MutableRefObject<string>;
  lastPersistedWorkspaceRevisionRef: React.MutableRefObject<number>;
}): Promise<void> => {
  const { caseId, targetCaseId, position, workspace, setWorkspace, lastPersistedWorkspaceValueRef, lastPersistedWorkspaceRevisionRef } = args;

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

      const previousParentCaseId = (file.parentCaseId ?? '').trim() || null;
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
};
