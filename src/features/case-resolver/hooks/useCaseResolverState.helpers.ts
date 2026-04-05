import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import { stableStringify } from '@/shared/lib/ai-paths';

export {
  buildCaseResolverDraftCanonicalState,
  buildCaseResolverFileComparableFingerprint,
  buildCaseResolverDraftComparableFingerprint,
  hasCaseResolverDraftMeaningfulChanges,
  canCaseResolverDraftPerformInitialManualSave,
} from './useCaseResolverState.helpers.canonical';

export type { CaseResolverDraftCanonicalState } from './useCaseResolverState.helpers.canonical';

export {
  readStoredEditorDraft,
  writeStoredEditorDraft,
  clearStoredEditorDraft,
} from './useCaseResolverState.helpers.persistence';

export type {
  StoredCaseResolverEditorDraft,
  WriteStoredEditorDraftResult,
} from './useCaseResolverState.helpers.persistence';

export {
  normalizeUploadedCaseResolverFile,
  resolveUploadBaseFolder,
} from './useCaseResolverState.helpers.upload';

export type { CaseResolverUploadedFile } from './useCaseResolverState.helpers.upload';

export {
  createPlaceholderAssetName,
  createUniqueCaseFileName,
} from './useCaseResolverState.helpers.naming';

export { ensureSafeDocumentHtml } from '@/shared/lib/document-editor/public';
export {
  isLikelyImageFile,
  isLikelyPdfFile,
  isLikelyScanInputFile,
} from '@/features/case-resolver/utils/caseResolverUtils';

export {
  normalizeFolderRecords,
  appendOwnedFolderRecords,
  removeOwnedFolderRecordsWithinPath,
  renameOwnedFolderRecordsWithinPath,
  collectCaseScopeIds,
  resolveCaseContainerIdForFileId,
  resolveCaseContainerIdForFolderPath,
  resolveCaseResolverActiveCaseId,
  resolveCaseScopedFolderTarget,
} from './useCaseResolverState.helpers.folder-records';

export {
  isCaseResolverCreateContextReady,
  resolveCaseResolverFileById,
  resolveCaptureTargetFile,
  applyCaseResolverFileMutationAndRebaseDraft,
} from './useCaseResolverState.helpers.mutation';

export type {
  CaseResolverRequestedCaseStatus,
  CaseResolverCaptureTargetResolution,
  CaseResolverFileMutationStage,
} from './useCaseResolverState.helpers.mutation';

export const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;
export const CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS = 900;
export const CASE_RESOLVER_OCR_JOB_TIMEOUT_MS = 120_000;

export const serializeWorkspaceForUnsavedChangesCheck = (
  workspace: CaseResolverWorkspace
): string =>
  stableStringify({
    ...workspace,
    // Revision metadata is persistence bookkeeping, not user-facing edits.
    workspaceRevision: 0,
    lastMutationId: null,
    lastMutationAt: null,
    // Keep active selection changes from triggering global unsaved-change prompts.
    activeFileId: null,
  });

export const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, durationMs));
  });
