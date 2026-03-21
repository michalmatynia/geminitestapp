import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';
import type {
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverRequestedCaseStatus,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

import { createCaseResolverFile } from '../settings';
import { buildCaseResolverFileComparableFingerprint } from './useCaseResolverState.helpers.canonical';
import type {
  CaseResolverWorkspaceUpdateOptions,
  UseCaseResolverWorkspaceMutationsValue,
} from './useCaseResolverState.workspace-mutations';

export type { CaseResolverRequestedCaseStatus };

export const isCaseResolverCreateContextReady = ({
  activeCaseId,
  requestedFileId,
  requestedCaseStatus,
}: {
  activeCaseId: string | null;
  requestedFileId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
}): boolean => {
  if (!activeCaseId) return false;
  if (!requestedFileId) return true;
  return requestedCaseStatus === 'ready';
};

const normalizeCaseResolverFileId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const idsMatchByNormalization = (
  left: string | null | undefined,
  right: string | null | undefined
): boolean => {
  const normalizedLeft = normalizeCaseResolverFileId(left);
  const normalizedRight = normalizeCaseResolverFileId(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

export const resolveCaseResolverFileById = (
  files: CaseResolverWorkspace['files'],
  candidateId: string | null | undefined
): CaseResolverFile | null => {
  const normalizedCandidateId = normalizeCaseResolverFileId(candidateId);
  if (!normalizedCandidateId) return null;
  return (
    files.find((file: CaseResolverFile): boolean => file.id === candidateId) ??
    files.find(
      (file: CaseResolverFile): boolean =>
        normalizeCaseResolverFileId(file.id) === normalizedCandidateId
    ) ??
    null
  );
};

export type CaseResolverCaptureTargetResolution =
  | 'proposal_target'
  | 'context_target'
  | 'editing_draft'
  | 'unresolved';

export const resolveCaptureTargetFile = ({
  workspaceFiles,
  proposalTargetFileId,
  contextFileId = null,
  editingDraftFileId = null,
}: {
  workspaceFiles: CaseResolverWorkspace['files'];
  proposalTargetFileId: string | null | undefined;
  contextFileId?: string | null;
  editingDraftFileId?: string | null;
}): {
  file: CaseResolverFile | null;
  resolution: CaseResolverCaptureTargetResolution;
  resolvedTargetFileId: string | null;
} => {
  const proposalTarget = resolveCaseResolverFileById(workspaceFiles, proposalTargetFileId);
  if (proposalTarget) {
    return {
      file: proposalTarget,
      resolution: 'proposal_target',
      resolvedTargetFileId: proposalTarget.id,
    };
  }

  const contextTarget = resolveCaseResolverFileById(workspaceFiles, contextFileId);
  if (contextTarget) {
    return {
      file: contextTarget,
      resolution: 'context_target',
      resolvedTargetFileId: contextTarget.id,
    };
  }

  const editingDraftTarget = resolveCaseResolverFileById(workspaceFiles, editingDraftFileId);
  if (editingDraftTarget) {
    return {
      file: editingDraftTarget,
      resolution: 'editing_draft',
      resolvedTargetFileId: editingDraftTarget.id,
    };
  }

  return {
    file: null,
    resolution: 'unresolved',
    resolvedTargetFileId: null,
  };
};

export type CaseResolverFileMutationStage = 'precheck' | 'mutation' | null;

type CaseResolverWorkspaceUpdater = UseCaseResolverWorkspaceMutationsValue['updateWorkspace'];

type CaseResolverEditingDraftUpdater = React.Dispatch<
  React.SetStateAction<CaseResolverFileEditDraft | null>
>;

const applyCaseResolverFilePatch = ({
  baseFile,
  patch,
}: {
  baseFile: CaseResolverFile;
  patch: Partial<CaseResolverFile>;
}): CaseResolverFile =>
  createCaseResolverFile({
    ...baseFile,
    ...patch,
    parentCaseId: patch.parentCaseId === undefined ? baseFile.parentCaseId : patch.parentCaseId,
    createdAt:
      typeof patch.createdAt === 'string'
        ? patch.createdAt
        : baseFile.createdAt || new Date().toISOString(),
    updatedAt:
      typeof patch.updatedAt === 'string'
        ? patch.updatedAt
        : typeof baseFile.updatedAt === 'string'
          ? baseFile.updatedAt
          : baseFile.createdAt || new Date().toISOString(),
  });

export const applyCaseResolverFileMutationAndRebaseDraft = ({
  fileId,
  updateWorkspace,
  setEditingDocumentDraft,
  mutate,
  source,
  persistToast,
  activateFile = false,
  skipNormalization = false,
  fallbackFileOnMissing = null,
  allowFallbackOnMissing = true,
  precheckWorkspaceFiles = null,
}: {
  fileId: string;
  updateWorkspace: CaseResolverWorkspaceUpdater;
  setEditingDocumentDraft: CaseResolverEditingDraftUpdater;
  mutate: (file: CaseResolverFile) => Partial<CaseResolverFile> | null;
  source: string;
  persistToast?: string;
  activateFile?: boolean;
  skipNormalization?: boolean;
  fallbackFileOnMissing?: CaseResolverFile | null;
  allowFallbackOnMissing?: boolean;
  precheckWorkspaceFiles?: CaseResolverWorkspace['files'] | null;
}): {
  ok: boolean;
  stage: CaseResolverFileMutationStage;
  fileFound: boolean;
  changed: boolean;
  nextFile: CaseResolverFile | null;
  resolvedTargetFileId: string | null;
} => {
  const precheckTarget = precheckWorkspaceFiles
    ? resolveCaseResolverFileById(precheckWorkspaceFiles, fileId)
    : null;
  if (precheckWorkspaceFiles && !precheckTarget) {
    return {
      ok: false,
      stage: 'precheck',
      fileFound: false,
      changed: false,
      nextFile: null,
      resolvedTargetFileId: null,
    };
  }

  let fileFound = false;
  let changed = false;
  let nextFile: CaseResolverFile | null = null;
  let resolvedTargetFileId: string | null = precheckTarget?.id ?? null;

  const mutationOptions: CaseResolverWorkspaceUpdateOptions = {
    source,
    ...(persistToast ? { persistToast } : {}),
    ...(skipNormalization ? { skipNormalization: true } : {}),
  };
  const matchesTargetFileId = (candidateId: string): boolean =>
    idsMatchByNormalization(candidateId, resolvedTargetFileId ?? fileId);

  updateWorkspace((current) => {
    let localFileFound = false;
    let localChanged = false;
    let localNextFile: CaseResolverFile | null = null;
    const mutationTarget = resolveCaseResolverFileById(
      current.files,
      resolvedTargetFileId ?? fileId
    );
    let matchedFileId: string | null = mutationTarget?.id ?? null;
    let nextFiles = current.files;

    if (mutationTarget) {
      localFileFound = true;
      const patch = mutate(mutationTarget);
      if (patch) {
        const normalizedNextFile = applyCaseResolverFilePatch({
          baseFile: mutationTarget,
          patch,
        });
        if (
          buildCaseResolverFileComparableFingerprint(mutationTarget) !==
          buildCaseResolverFileComparableFingerprint(normalizedNextFile)
        ) {
          localChanged = true;
          localNextFile = normalizedNextFile;
          nextFiles = current.files.map(
            (file: CaseResolverFile): CaseResolverFile =>
              file.id === mutationTarget.id ? normalizedNextFile : file
          );
        }
      }
    }

    if (
      !localFileFound &&
      allowFallbackOnMissing &&
      fallbackFileOnMissing &&
      matchesTargetFileId(fallbackFileOnMissing.id)
    ) {
      localFileFound = true;
      matchedFileId = fallbackFileOnMissing.id;
      const patch = mutate(fallbackFileOnMissing);
      if (patch) {
        const normalizedNextFile = applyCaseResolverFilePatch({
          baseFile: fallbackFileOnMissing,
          patch,
        });
        localChanged = true;
        localNextFile = normalizedNextFile;
        nextFiles = [...current.files, normalizedNextFile];
      }
    }

    fileFound = localFileFound;
    changed = localChanged;
    nextFile = localNextFile;
    if (matchedFileId) {
      resolvedTargetFileId = matchedFileId;
    }

    if (!localFileFound) return current;
    const activeTargetFileId = matchedFileId ?? fileId;
    const nextActiveFileId =
      activateFile && current.activeFileId !== activeTargetFileId
        ? activeTargetFileId
        : current.activeFileId;
    const activeFileChanged = nextActiveFileId !== current.activeFileId;
    if (!localChanged && !activeFileChanged) return current;
    return {
      ...current,
      activeFileId: nextActiveFileId,
      files: localChanged ? nextFiles : current.files,
    };
  }, mutationOptions);

  const nextFileSnapshot = nextFile;
  if (nextFileSnapshot !== null) {
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
      if (!current) return current;
      const currentDraft = current;
      const nextSnapshot: CaseResolverFile = nextFileSnapshot;
      if (
        currentDraft.id !== nextSnapshot.id &&
        !idsMatchByNormalization(currentDraft.id, resolvedTargetFileId ?? fileId)
      ) {
        return current;
      }
      const rebasedBase = nextSnapshot;
      const rebasedDraft = buildFileEditDraft(rebasedBase);
      return {
        ...rebasedDraft,
      };
    });
  }

  if (!fileFound) {
    return {
      ok: false,
      stage: 'mutation',
      fileFound: false,
      changed: false,
      nextFile: null,
      resolvedTargetFileId,
    };
  }

  return {
    ok: true,
    stage: null,
    fileFound,
    changed,
    nextFile,
    resolvedTargetFileId,
  };
};
