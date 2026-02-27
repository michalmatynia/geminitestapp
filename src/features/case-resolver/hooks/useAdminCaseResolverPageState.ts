'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useMemo, useRef, useEffect } from 'react';

import {
  stableStringify,
} from '@/shared/lib/ai-paths';
import type { FilemakerPartyKind } from '@/features/filemaker';
import {
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import {
  DEFAULT_CASE_RESOLVER_NODE_META,
} from '@/shared/contracts/case-resolver';
import type {
  AiNode,
  CaseResolverFile,
  CaseResolverNodeMeta,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { useToast } from '@/shared/ui';

import { useCaseResolverState } from './useCaseResolverState';
import {
  hasCaseResolverDraftMeaningfulChanges,
} from './useCaseResolverState.helpers';
import { stripCaseContextQueryParams } from './useCaseResolverState.helpers.requested-context';
import {
  type CaseResolverFileEditDraft,
  type CaseResolverStateValue,
} from '../types';
import {
  isPathWithinFolder,
} from '../utils/caseResolverUtils';
import { logCaseResolverDurationMetric } from '../runtime';

import { useAdminCaseResolverCaptureActions } from './useAdminCaseResolverCaptureActions';
import { useAdminCaseResolverEditorUiState } from './useAdminCaseResolverEditorUiState';
import { useAdminCaseResolverDocumentActions } from './useAdminCaseResolverDocumentActions';
import { useAdminCaseResolverRelationActions } from './useAdminCaseResolverRelationActions';
import { useAdminCaseResolverMetadataActions } from './useAdminCaseResolverMetadataActions';

export function useAdminCaseResolverPageState() {
  const state: CaseResolverStateValue = useCaseResolverState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const {
    workspace,
    workspaceRef,
    selectedFileId,
    selectedAssetId,
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
    editingDocumentDraft,
    editingDocumentNodeContext,
    setEditingDocumentDraft,
    isUploadingScanDraftFiles,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    caseResolverSettings,
    filemakerDatabase,
    requestedFileId,
    requestedContextAutoClearRequestKey,
    handleAcknowledgeRequestedContextAutoClear,
    handleResetCaseContext: resetCaseContextState,
    shouldOpenEditorFromQuery,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleOpenFileEditor,
    handleRenameFolder,
    updateWorkspace,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    refetchSettingsStore,
    confirmAction,
    setActiveMainView,
    handleSelectFile,
    handleCreateFile,
    setWorkspace,
    handleDiscardFileEditorDraft,
  } = state;

  const openEditorFromQueryHandledRef = useRef<string | null>(null);
  const autoClearRequestKeyHandledRef = useRef<string | null>(null);
  const editorDirtyEvalDurationMsRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!shouldOpenEditorFromQuery || !requestedFileId) {
      openEditorFromQueryHandledRef.current = null;
      return;
    }
    if (openEditorFromQueryHandledRef.current === requestedFileId) return;
    if (editingDocumentDraft?.id === requestedFileId) {
      openEditorFromQueryHandledRef.current = requestedFileId;
      return;
    }
    const fileExists = workspace.files.some((file) => file.id === requestedFileId);
    if (!fileExists) return;
    handleOpenFileEditor(requestedFileId);
    openEditorFromQueryHandledRef.current = requestedFileId;
  }, [
    editingDocumentDraft?.id,
    handleOpenFileEditor,
    requestedFileId,
    shouldOpenEditorFromQuery,
    workspace.files,
  ]);

  useEffect(() => {
    const autoClearRequestKey = requestedContextAutoClearRequestKey?.trim() ?? '';
    if (!autoClearRequestKey) {
      autoClearRequestKeyHandledRef.current = null;
      return;
    }
    if (autoClearRequestKeyHandledRef.current === autoClearRequestKey) return;
    autoClearRequestKeyHandledRef.current = autoClearRequestKey;
    handleAcknowledgeRequestedContextAutoClear(autoClearRequestKey);
    const nextQuery = stripCaseContextQueryParams(searchParams.toString());
    router.replace(nextQuery ? `/admin/case-resolver?${nextQuery}` : '/admin/case-resolver');
  }, [
    handleAcknowledgeRequestedContextAutoClear,
    requestedContextAutoClearRequestKey,
    router,
    searchParams,
  ]);

  const editorUi = useAdminCaseResolverEditorUiState({
    editingDocumentDraft,
  });

  const captureActions = useAdminCaseResolverCaptureActions({
    workspace,
    workspaceRef,
    filemakerDatabase,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    editingDocumentDraft,
    setEditingDocumentDraft,
    updateWorkspace,
    refetchSettingsStore,
    setEditorContentRevisionSeed: editorUi.setEditorContentRevisionSeed,
  });

  const documentActions = useAdminCaseResolverDocumentActions({
    editingDocumentDraft,
    setEditingDocumentDraft,
    filemakerDatabase,
    router,
    setEditorContentRevisionSeed: editorUi.setEditorContentRevisionSeed,
    handleRunScanFileOcr,
    scanDraftUploadInputRef: editorUi.scanDraftUploadInputRef,
    isUploadingScanDraftFiles,
    handleUploadScanFiles,
  });

  const relationActions = useAdminCaseResolverRelationActions({
    workspace,
    updateWorkspace,
  });

  const activeCaseFile = useMemo(
    () => workspace.files.find(f => f.id === state.activeCaseId) ?? null,
    [state.activeCaseId, workspace.files]
  );

  const metadataActions = useAdminCaseResolverMetadataActions({
    workspace,
    updateWorkspace,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    filemakerDatabase,
    activeCaseFile,
  });

  const isEditorDraftDirty = useMemo(() => {
    const dirtyEvalStartedAtMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const completeDirtyEval = (result: boolean): boolean => {
      const dirtyEvalCompletedAtMs =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      editorDirtyEvalDurationMsRef.current = dirtyEvalCompletedAtMs - dirtyEvalStartedAtMs;
      return result;
    };
    if (!editingDocumentDraft) return completeDirtyEval(false);
    const currentFile = workspace.files.find((file) => file.id === editingDocumentDraft.id);
    if (!currentFile) return completeDirtyEval(false);
    return completeDirtyEval(hasCaseResolverDraftMeaningfulChanges({
      draft: editingDocumentDraft,
      file: currentFile,
    }));
  }, [editingDocumentDraft, workspace.files]);

  useEffect((): void => {
    const durationMs = editorDirtyEvalDurationMsRef.current;
    if (typeof durationMs !== 'number') return;
    logCaseResolverDurationMetric('editor_dirty_eval_ms', durationMs, {
      source: 'editor_state',
      minDurationMs: 1,
      message: `draft_present=${editingDocumentDraft ? 'true' : 'false'} dirty=${isEditorDraftDirty ? 'true' : 'false'}`,
    });
  }, [editingDocumentDraft, isEditorDraftDirty, workspace.files]);

  const resolvePromptExploderMatchedPartyLabel = useCallback(
    (reference: { kind: string; id: string } | null | undefined): string => {
      if (!reference) return 'None';
      return (
        resolveFilemakerPartyLabel(filemakerDatabase, { ...reference, kind: reference.kind as FilemakerPartyKind }) ??
              `${reference.kind}:${reference.id}`
      );
    },
    [filemakerDatabase]
  );
      
  const normalizeNodeTextColor = useCallback((value: string | null | undefined): string => {
    if (typeof value !== 'string') return '';
    const normalized = value.trim();
    if (!normalized) return '';
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : '';
  }, []);

  const editingDocumentNodeMeta = useMemo((): (CaseResolverNodeMeta & { nodeId: string; nodeTitle: string; canvasFileId: string; canvasFileName: string }) | null => {
    if (!editingDocumentDraft || !editingDocumentNodeContext?.nodeId) return null;
    const canvasFile = workspace.files.find(
      (file: CaseResolverFile) => file.id === editingDocumentNodeContext.fileId
    );
    if (!canvasFile?.graph) return null;
    const canvasNode = canvasFile.graph.nodes.find(
      (node: AiNode) => node.id === editingDocumentNodeContext.nodeId
    );
    if (!canvasNode) return null;
    const rawNodeMeta =
      (canvasFile.graph.nodeMeta as Record<string, CaseResolverNodeMeta>)?.[editingDocumentNodeContext.nodeId] ??
      DEFAULT_CASE_RESOLVER_NODE_META;
    return {
      ...DEFAULT_CASE_RESOLVER_NODE_META,
      ...rawNodeMeta,
      textColor: normalizeNodeTextColor(rawNodeMeta.textColor),
      nodeId: editingDocumentNodeContext.nodeId,
      nodeTitle: canvasNode.title.trim() || editingDocumentNodeContext.nodeId,
      canvasFileId: canvasFile.id,
      canvasFileName: canvasFile.name,
    };
  }, [
    editingDocumentDraft,
    editingDocumentNodeContext,
    normalizeNodeTextColor,
    workspace.files,
  ]);

  const updateEditingDocumentNodeMeta = useCallback(
    (patch: Partial<CaseResolverNodeMeta>): void => {
      if (!editingDocumentNodeContext?.nodeId) return;
      const canvasFileId = editingDocumentNodeContext.fileId;
      const nodeId = editingDocumentNodeContext.nodeId;
      updateWorkspace((current: CaseResolverWorkspace) => {
        const canvasFileIndex = current.files.findIndex((file: CaseResolverFile) => file.id === canvasFileId);
        if (canvasFileIndex < 0) return current;
        const canvasFile = current.files[canvasFileIndex];
        if (!canvasFile?.graph) return current;
        if (canvasFile.isLocked) return current;
        const hasNode = canvasFile.graph.nodes.some((node: AiNode) => node.id === nodeId);
        if (!hasNode) return current;

        const rawNodeMeta =
          (canvasFile.graph.nodeMeta as Record<string, CaseResolverNodeMeta>)?.[nodeId] ?? DEFAULT_CASE_RESOLVER_NODE_META;
        const currentNodeMeta: CaseResolverNodeMeta = {
          ...DEFAULT_CASE_RESOLVER_NODE_META,
          ...rawNodeMeta,
          textColor: normalizeNodeTextColor(rawNodeMeta.textColor),
        };
        const normalizedPatch: Partial<CaseResolverNodeMeta> = {
          ...patch,
          ...(patch.textColor !== undefined
            ? { textColor: normalizeNodeTextColor(patch.textColor) }
            : {}),
        };
        const nextNodeMeta: CaseResolverNodeMeta = {
          ...currentNodeMeta,
          ...normalizedPatch,
        };
        if (stableStringify(nextNodeMeta) === stableStringify(currentNodeMeta)) {
          return current;
        }

        const now = new Date().toISOString();
        const nextCanvasFile = {
          ...canvasFile,
          graph: {
            ...canvasFile.graph,
            nodeMeta: {
              ...(canvasFile.graph.nodeMeta as Record<string, CaseResolverNodeMeta>),
              [nodeId]: nextNodeMeta,
            },
          },
          updatedAt: now,
        } as CaseResolverFile;
        return {
          ...current,
          files: current.files.map((file, index) => (
            index === canvasFileIndex ? nextCanvasFile : file
          )),
        };
      });
    },
    [editingDocumentNodeContext, normalizeNodeTextColor, updateWorkspace]
  );

  const updateEditingDocumentDraft = useCallback(
    (patch: Partial<CaseResolverFileEditDraft>): void => {
      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null): CaseResolverFileEditDraft | null => {
        if (!current || current.isLocked) return current;
        return { ...current, ...patch };
      });
    },
    [setEditingDocumentDraft]
  );

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      const sourceFolderName = folderPath.includes('/')
        ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
        : folderPath;
      const nextRootFolder = targetFolder ? `${targetFolder}/${sourceFolderName}` : sourceFolderName;
      if (nextRootFolder === folderPath) return;
      await handleRenameFolder(folderPath, nextRootFolder);
    },
    [handleRenameFolder]
  );

  const handleToggleFolderLock = useCallback(
    (folderPath: string): void => {
      const folderFiles = workspace.files.filter((file) =>
        isPathWithinFolder(file.folder, folderPath)
      );
      const shouldLock = folderFiles.some((file) => !file.isLocked);
      updateWorkspace(
        (current: CaseResolverWorkspace) => {
          const now = new Date().toISOString();
          let changed = false;
          const nextFiles = current.files.map((file) => {
            if (!isPathWithinFolder(file.folder, folderPath)) return file;
            if (file.isLocked === shouldLock) return file;
            changed = true;
            return {
              ...file,
              isLocked: shouldLock,
              updatedAt: now,
            };
          });
          if (!changed) return current;
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );
      setEditingDocumentDraft((current) => {
        if (!current) return current;
        if (!isPathWithinFolder(current.folder, folderPath)) return current;
        if (current.isLocked === shouldLock) return current;
        return {
          ...current,
          isLocked: shouldLock,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [setEditingDocumentDraft, updateWorkspace, workspace.files]
  );

  const handleToggleFileLock = useCallback(
    (fileId: string): void => {
      updateWorkspace(
        (current: CaseResolverWorkspace) => {
          const target = current.files.find((file) => file.id === fileId);
          if (!target) return current;
          const nextLocked = !target.isLocked;
          const now = new Date().toISOString();
          const nextFiles = current.files.map((file) =>
            file.id === fileId
              ? {
                ...file,
                isLocked: nextLocked,
                updatedAt: now,
              }
              : file
          );
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );
      setEditingDocumentDraft((current) => {
        if (current?.id !== fileId) return current;
        return {
          ...current,
          isLocked: !current.isLocked,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [setEditingDocumentDraft, updateWorkspace]
  );

  const handleDeleteFile = useCallback(
    (fileId: string): void => {
      const target = workspace.files.find((file) => file.id === fileId);
      if (!target) return;
      const behavesAsCaseContainer =
        target.fileType === 'case' ||
        workspace.files.some((file) => file.parentCaseId === target.id);
      if (behavesAsCaseContainer) {
        toast('Cases cannot be removed from folder tree. Remove the case in Cases list.', {
          variant: 'warning',
        });
        return;
      }
      if (target.isLocked) {
        toast('Document is locked. Unlock it in Case Resolver before removing.', { variant: 'warning' });
        return;
      }

      const parentContainerId =
        target.parentCaseId &&
        workspace.files.some((file) => file.id === target.parentCaseId && file.fileType === 'case')
          ? target.parentCaseId
          : null;
      const viewBeforeDelete = editorUi.workspaceView;
      const runDelete = (): void => {
        updateWorkspace(
          (current: CaseResolverWorkspace) => {
            const exists = current.files.some((file) => file.id === fileId);
            if (!exists) return current;
            const currentTarget = current.files.find((file) => file.id === fileId) ?? null;
            if (currentTarget?.isLocked) return current;
            const now = new Date().toISOString();
            const nextFiles = current.files
              .filter((file) => file.id !== fileId)
              .map((file) => {
                const nextRelatedFileIds = (file.relatedFileIds ?? []).filter(
                  (relatedFileId: string): boolean => relatedFileId !== fileId
                );
                if (nextRelatedFileIds.length === (file.relatedFileIds ?? []).length) {
                  return file;
                }
                return {
                  ...file,
                  relatedFileIds: nextRelatedFileIds.length > 0 ? nextRelatedFileIds : undefined,
                  updatedAt: now,
                };
              });
            return {
              ...current,
              files: nextFiles,
              activeFileId:
                current.activeFileId === fileId
                  ? (parentContainerId ?? nextFiles[0]?.id ?? null)
                  : current.activeFileId,
            };
          },
          { persistToast: 'Document removed.' }
        );
        if (selectedFileId === fileId) {
          setSelectedFileId(parentContainerId);
          setSelectedAssetId(null);
          setSelectedFolderPath(null);
        }
        if (editingDocumentDraft?.id === fileId) {
          setEditingDocumentDraft(null);
        }
        editorUi.preserveWorkspaceView(viewBeforeDelete);
      };

      if (!caseResolverSettings.confirmDeleteDocument) {
        runDelete();
        return;
      }

      confirmAction({
        title: 'Delete Document?',
        message: `Are you sure you want to delete document "${target.name}"? This action cannot be undone.`,
        confirmText: 'Delete Document',
        isDangerous: true,
        onConfirm: runDelete,
      });
    },
    [
      caseResolverSettings.confirmDeleteDocument,
      confirmAction,
      editingDocumentDraft?.id,
      editorUi,
      selectedFileId,
      setEditingDocumentDraft,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      updateWorkspace,
      workspace.files,
    ]
  );

  const handleDeleteAsset = useCallback(
    (assetId: string): void => {
      const target = workspace.assets.find((asset) => asset.id === assetId);
      if (!target) return;

      const viewBeforeDelete = editorUi.workspaceView;
      const runDelete = (): void => {
        updateWorkspace(
          (current: CaseResolverWorkspace) => {
            const exists = current.assets.some((asset) => asset.id === assetId);
            if (!exists) return current;
            return {
              ...current,
              assets: current.assets.filter((asset) => asset.id !== assetId),
            };
          },
          { persistToast: 'Asset removed.' }
        );
        if (selectedAssetId === assetId) {
          setSelectedAssetId(null);
          setSelectedFolderPath(null);
        }
        editorUi.preserveWorkspaceView(viewBeforeDelete);
      };

      if (!caseResolverSettings.confirmDeleteDocument) {
        runDelete();
        return;
      }

      confirmAction({
        title: 'Delete Asset?',
        message: `Are you sure you want to delete "${target.name}"? This action cannot be undone.`,
        confirmText: 'Delete Asset',
        isDangerous: true,
        onConfirm: runDelete,
      });
    },
    [
      caseResolverSettings.confirmDeleteDocument,
      confirmAction,
      editorUi,
      selectedAssetId,
      setSelectedAssetId,
      setSelectedFolderPath,
      updateWorkspace,
      workspace.assets,
    ]
  );

  const handleDeactivateActiveFile = useCallback((): void => {
    const deactivate = (): void => {
      handleDiscardFileEditorDraft();
      setSelectedFileId(null);
      setSelectedAssetId(null);
      setSelectedFolderPath(null);
      setWorkspace((current) => {
        const nextActiveFileId = activeCaseFile?.id ?? null;
        if (current.activeFileId === nextActiveFileId) return current;
        return {
          ...current,
          activeFileId: nextActiveFileId,
        };
      });
      editorUi.setWorkspaceView('document');
    };

    if (editingDocumentDraft && isEditorDraftDirty) {
      confirmAction({
        title: 'Unsaved Changes',
        message:
          'You have unsaved changes in this document. Keep editing or discard and switch to case options?',
        cancelText: 'Keep Editing',
        confirmText: 'Discard + Switch',
        isDangerous: true,
        onConfirm: deactivate,
      });
      return;
    }

    deactivate();
  }, [
    activeCaseFile?.id,
    confirmAction,
    editingDocumentDraft,
    handleDiscardFileEditorDraft,
    isEditorDraftDirty,
    setSelectedAssetId,
    setSelectedFileId,
    setSelectedFolderPath,
    setWorkspace,
    editorUi,
  ]);

  const handleCreateDocumentFromSearch = useCallback((): void => {
    setActiveMainView('workspace');
    handleCreateFile(null);
  }, [handleCreateFile, setActiveMainView]);

  const handleOpenFileFromSearch = useCallback(
    (id: string): void => {
      setActiveMainView('workspace');
      handleSelectFile(id);
    },
    [handleSelectFile, setActiveMainView],
  );

  const handleEditFileFromSearch = useCallback(
    (id: string): void => {
      setActiveMainView('workspace');
      handleOpenFileEditor(id);
    },
    [handleOpenFileEditor, setActiveMainView],
  );

  const handleScanDraftDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    editorUi.setIsScanDraftDropActive(true);
  }, [editorUi]);

  const handleScanDraftDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    editorUi.setIsScanDraftDropActive(true);
  }, [editorUi]);

  const handleScanDraftDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    editorUi.setIsScanDraftDropActive(false);
  }, [editorUi]);

  const handleScanDraftDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      editorUi.setIsScanDraftDropActive(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        documentActions.uploadScanDraftFiles(files);
      }
    },
    [editorUi, documentActions]
  );

  const handleScanDraftUploadInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) {
        documentActions.uploadScanDraftFiles(files);
      }
      event.target.value = '';
    },
    [documentActions]
  );

  const handleResetCaseContext = useCallback((): void => {
    resetCaseContextState();
    autoClearRequestKeyHandledRef.current = null;
    const nextQuery = stripCaseContextQueryParams(searchParams.toString());
    router.replace(nextQuery ? `/admin/case-resolver?${nextQuery}` : '/admin/case-resolver');
  }, [resetCaseContextState, router, searchParams]);

  return {
    state,
    ...state,
    ...editorUi,
    ...captureActions,
    ...documentActions,
    ...relationActions,
    ...metadataActions,
    isEditorDraftDirty,
    resolvePromptExploderMatchedPartyLabel,
    editingDocumentNodeMeta,
    updateEditingDocumentNodeMeta,
    updateEditingDocumentDraft,
    handleMoveFolder,
    handleToggleFolderLock,
    handleToggleFileLock,
    handleDeleteFile,
    handleDeleteAsset,
    handleScanDraftDragEnter,
    handleScanDraftDragOver,
    handleScanDraftDragLeave,
    handleScanDraftDrop,
    handleScanDraftUploadInputChange,
    handleUpdateActiveFileParties: state.handleUpdateActiveFileParties,
    handleLinkRelatedFiles: state.handleLinkRelatedFiles,
    handleUnlinkRelatedFile: state.handleUnlinkRelatedFile,
    handleSaveFileEditor: state.handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    handleDeactivateActiveFile,
    handleCreateDocumentFromSearch,
    handleOpenFileFromSearch,
    handleEditFileFromSearch,
    handleResetCaseContext,
    activeCaseFile,
  };
}
