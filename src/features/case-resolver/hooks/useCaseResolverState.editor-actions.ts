import { useCallback } from 'react';

import {
  buildFileEditDraft,
  createCaseResolverHistorySnapshotEntry,
} from '@/features/case-resolver/utils/caseResolverUtils';
import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  hasHtmlMarkup,
  ensureSafeDocumentHtml,
  stripHtmlToPlainText,
  toStorageDocumentValue,
} from '@/features/document-editor';
import type {
  CaseResolverEditorNodeContext,
  CaseResolverFile,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { Toast } from '@/shared/contracts/ui';

import { createCaseResolverFile } from '../settings';
import { type CaseResolverFileEditDraft } from '../types';
import {
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
  buildCaseResolverDraftCanonicalState,
  canCaseResolverDraftPerformInitialManualSave,
  clearStoredEditorDraft,
  hasCaseResolverDraftMeaningfulChanges,
} from './useCaseResolverState.helpers';
type CaseResolverOpenFileEditorOptions = {
  nodeContext?: CaseResolverEditorNodeContext | null;
};

export function useCaseResolverStateEditorActions({
  workspace,
  updateWorkspace,
  editingDocumentDraft,
  setEditingDocumentDraft,
  setEditingDocumentNodeContext,
  setSelectedFileId,
  setSelectedAssetId,
  setSelectedFolderPath,
  setWorkspace,
  toast,
}: {
  workspace: CaseResolverWorkspace;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      mutationId?: string;
      source?: string;
      skipNormalization?: boolean;
    }
  ) => void;
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setEditingDocumentNodeContext: React.Dispatch<
    React.SetStateAction<CaseResolverEditorNodeContext | null>
  >;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  toast: Toast;
}) {
  const handleOpenFileEditor = useCallback(
    (fileId: string, options?: CaseResolverOpenFileEditorOptions): void => {
      const target = workspace.files.find((file) => file.id === fileId);
      if (!target) {
        setEditingDocumentNodeContext(null);
        toast('File not found.', { variant: 'warning' });
        return;
      }
      if (target.fileType === 'case') {
        setEditingDocumentNodeContext(null);
        toast('Cases are edited in the Cases list. Select a document to edit.', {
          variant: 'info',
        });
        return;
      }
      const baseDraft = buildFileEditDraft(target);
      const mergedDraft: CaseResolverFileEditDraft = {
        ...baseDraft,
        documentHistory: baseDraft.documentHistory ?? [],
      };
      const canonicalDraft = (() => {
        if (mergedDraft.fileType === 'scanfile') {
          const resolvedDraftMarkdown = (() => {
            if (
              typeof mergedDraft.documentContentMarkdown === 'string' &&
              mergedDraft.documentContentMarkdown.trim().length > 0
            ) {
              return mergedDraft.documentContentMarkdown;
            }
            if (
              typeof mergedDraft.documentContentPlainText === 'string' &&
              mergedDraft.documentContentPlainText.trim().length > 0
            ) {
              return mergedDraft.documentContentPlainText;
            }
            const fallbackContent = mergedDraft.documentContent ?? '';
            if (fallbackContent.trim().length > 0) {
              return hasHtmlMarkup(fallbackContent)
                ? stripHtmlToPlainText(fallbackContent)
                : fallbackContent;
            }
            if (
              typeof mergedDraft.documentContentHtml === 'string' &&
              mergedDraft.documentContentHtml.trim().length > 0
            ) {
              return stripHtmlToPlainText(mergedDraft.documentContentHtml);
            }
            return '';
          })();
          return deriveDocumentContentSync({
            mode: 'markdown',
            value: resolvedDraftMarkdown,
            previousHtml: mergedDraft.documentContentHtml,
            previousMarkdown: mergedDraft.documentContentMarkdown,
          });
        }

        const resolvedDraftHtml = (() => {
          if (
            typeof mergedDraft.documentContentHtml === 'string' &&
            mergedDraft.documentContentHtml.trim().length > 0
          ) {
            return mergedDraft.documentContentHtml;
          }
          if (
            typeof mergedDraft.documentContentMarkdown === 'string' &&
            mergedDraft.documentContentMarkdown.trim().length > 0
          ) {
            return ensureHtmlForPreview(mergedDraft.documentContentMarkdown, 'markdown');
          }
          return ensureSafeDocumentHtml(mergedDraft.documentContent ?? '');
        })();
        return deriveDocumentContentSync({
          mode: 'wysiwyg',
          value: resolvedDraftHtml,
          previousHtml: mergedDraft.documentContentHtml,
          previousMarkdown: mergedDraft.documentContentMarkdown,
        });
      })();
      const nextDraft: CaseResolverFileEditDraft = {
        ...mergedDraft,
        editorType: mergedDraft.fileType === 'scanfile' ? 'markdown' : 'wysiwyg',
        documentContentFormatVersion: 1,
        documentContent: toStorageDocumentValue(canonicalDraft),
        documentContentMarkdown: canonicalDraft.markdown,
        documentContentHtml: canonicalDraft.html,
        documentContentPlainText: canonicalDraft.plainText,
        documentConversionWarnings: canonicalDraft.warnings,
      };
      clearStoredEditorDraft(fileId);
      setEditingDocumentDraft(nextDraft);
      setEditingDocumentNodeContext(options?.nodeContext ?? null);
      setSelectedFileId(fileId);
      setSelectedAssetId(null);
      setSelectedFolderPath(null);
      setWorkspace((current) =>
        current.activeFileId === fileId
          ? current
          : {
            ...current,
            activeFileId: fileId,
          }
      );
    },
    [
      workspace.files,
      toast,
      setEditingDocumentNodeContext,
      setEditingDocumentDraft,
      setSelectedFileId,
      setSelectedAssetId,
      setSelectedFolderPath,
      setWorkspace,
    ]
  );

  const handleSaveFileEditor = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const currentFile = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === editingDocumentDraft.id
    );
    if (!currentFile) {
      toast('Document no longer exists. Please refresh list.', { variant: 'warning' });
      return;
    }
    if (currentFile.isLocked) {
      setEditingDocumentDraft((current) =>
        current?.id === currentFile.id ? buildFileEditDraft(currentFile) : current
      );
      toast('Document is locked. Unlock it in Case Resolver before saving.', {
        variant: 'warning',
      });
      return;
    }
    const hasVersionDrift =
      currentFile.documentContentVersion !== editingDocumentDraft.baseDocumentContentVersion;
    const canonicalState = buildCaseResolverDraftCanonicalState(editingDocumentDraft);
    const nextStoredContent = canonicalState.storedContent;
    const nextOriginalDocumentContent = canonicalState.originalDocumentContent;
    const nextExplodedDocumentContent = canonicalState.explodedDocumentContent;
    const hasContentChanges =
      currentFile.activeDocumentVersion !== editingDocumentDraft.activeDocumentVersion ||
      currentFile.editorType !== canonicalState.mode ||
      currentFile.documentContent !== nextStoredContent ||
      currentFile.documentContentMarkdown !== canonicalState.markdown ||
      currentFile.documentContentHtml !== canonicalState.html ||
      currentFile.documentContentPlainText !== canonicalState.plainText ||
      JSON.stringify(currentFile.documentConversionWarnings) !==
        JSON.stringify(canonicalState.warnings) ||
      currentFile.originalDocumentContent !== nextOriginalDocumentContent ||
      currentFile.explodedDocumentContent !== nextExplodedDocumentContent;
    const hasMeaningfulChanges = hasCaseResolverDraftMeaningfulChanges({
      draft: editingDocumentDraft,
      file: currentFile,
      canonicalState,
    });
    const canSavePristineInitialDocument = canCaseResolverDraftPerformInitialManualSave({
      draft: editingDocumentDraft,
      file: currentFile,
      canonicalState,
    });

    if (!hasMeaningfulChanges && !canSavePristineInitialDocument) {
      clearStoredEditorDraft(editingDocumentDraft.id);
      if (hasVersionDrift) {
        setEditingDocumentDraft((current) =>
          current?.id === editingDocumentDraft.id ? buildFileEditDraft(currentFile) : current
        );
        toast('Document is already synced with the latest version. No changes to save.', {
          variant: 'info',
        });
        return;
      }
      toast('No document changes to save.', { variant: 'info' });
      return;
    }
    if (hasVersionDrift) {
      toast('Document changed while editor was open. Saving on top of latest version.', {
        variant: 'warning',
      });
    }
    const now = new Date().toISOString();
    const nextDocumentContentVersion = currentFile.documentContentVersion + 1;
    const currentSnapshot = hasContentChanges
      ? createCaseResolverHistorySnapshotEntry({
        savedAt: now,
        documentContentVersion: currentFile.documentContentVersion,
        activeDocumentVersion: currentFile.activeDocumentVersion,
        editorType: currentFile.editorType,
        documentContent: currentFile.documentContent,
        documentContentMarkdown: currentFile.documentContentMarkdown,
        documentContentHtml: currentFile.documentContentHtml,
        documentContentPlainText: currentFile.documentContentPlainText,
      })
      : null;
    const nextDocumentHistory = currentSnapshot
      ? [currentSnapshot, ...currentFile.documentHistory].slice(
        0,
        CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT
      )
      : currentFile.documentHistory;
    const nextParentCaseId =
      editingDocumentDraft.parentCaseId === undefined
        ? currentFile.parentCaseId
        : editingDocumentDraft.parentCaseId;
    const nextSavedFile = createCaseResolverFile({
      ...currentFile,
      ...editingDocumentDraft,
      parentCaseId: nextParentCaseId,
      editorType: canonicalState.mode,
      documentContentFormatVersion: 1,
      documentContentVersion: nextDocumentContentVersion,
      documentContent: nextStoredContent,
      documentContentMarkdown: canonicalState.markdown,
      documentContentHtml: canonicalState.html,
      documentContentPlainText: canonicalState.plainText,
      documentHistory: nextDocumentHistory,
      documentConversionWarnings: canonicalState.warnings,
      lastContentConversionAt: now,
      originalDocumentContent: nextOriginalDocumentContent,
      explodedDocumentContent: nextExplodedDocumentContent,
      createdAt: editingDocumentDraft.createdAt || currentFile.createdAt || now,
      updatedAt: now,
    });
    updateWorkspace(
      (current) => ({
        ...current,
        files: current.files.map((file) =>
          file.id === editingDocumentDraft.id ? nextSavedFile : file
        ),
      }),
      {
        persistToast: 'Document changes saved.',
        source: 'case_view_document_save',
      }
    );
    clearStoredEditorDraft(editingDocumentDraft.id);
    setEditingDocumentDraft((current) => {
      if (current?.id !== editingDocumentDraft.id) return current;
      return buildFileEditDraft(nextSavedFile);
    });
  }, [editingDocumentDraft, toast, updateWorkspace, workspace.files, setEditingDocumentDraft]);

  const handleDiscardFileEditorDraft = useCallback((): void => {
    if (editingDocumentDraft) {
      clearStoredEditorDraft(editingDocumentDraft.id);
    }
    setEditingDocumentDraft(null);
    setEditingDocumentNodeContext(null);
  }, [editingDocumentDraft, setEditingDocumentDraft, setEditingDocumentNodeContext]);

  return {
    handleOpenFileEditor,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
  };
}
