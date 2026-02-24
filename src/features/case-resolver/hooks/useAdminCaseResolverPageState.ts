'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';

import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import { upsertFilemakerCaptureCandidate } from '@/features/case-resolver-capture/filemaker-upsert';
import type {
  CaseResolverCaptureDocumentDateAction,
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  stripAcceptedCaptureContentFromTextWithReport,
} from '@/features/case-resolver-capture/proposals';
import {
  type CaseResolverCaptureAction,
} from '@/features/case-resolver-capture/settings';
import {
  deriveDocumentContentSync,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
  type DocumentContentCanonical,
} from '@/features/document-editor';
import type { FilemakerPartyKind } from '@/features/filemaker';
import type { FilemakerDatabase } from '@/shared/contracts/filemaker';
import {
  FILEMAKER_DATABASE_KEY,
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  normalizeFilemakerDatabase,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import { savePromptExploderDraftPromptFromCaseResolver } from '@/features/prompt-exploder/bridge';
import {
  DEFAULT_CASE_RESOLVER_NODE_META,
} from '@/shared/contracts/case-resolver';
import type {
  AiNode,
  CaseResolverAssetFile,
  CaseResolverCategory,
  CaseResolverDocumentHistoryEntry,
  CaseResolverFile,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
  CaseResolverWorkspace,
  CaseResolverNodeMeta,
} from '@/shared/contracts/case-resolver';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';

import { buildPathLabelMap } from '../pages/admin-case-resolver-page-helpers';
import {
  resolveCaptureMappingApplyGuardReason,
} from '../capture-mapping-apply-guard';
import { useCaseResolverState } from './useCaseResolverState';
import {
  applyCaseResolverFileMutationAndRebaseDraft,
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
  hasCaseResolverDraftMeaningfulChanges,
  resolveCaptureTargetFile,
  type CaseResolverFileMutationStage,
} from './useCaseResolverState.helpers';
import {
  createCaseResolverAssetFile,
  normalizeFolderPath,
  normalizeFolderPaths,
} from '../settings';
import {
  type CaseResolverFileEditDraft,
  type CaseResolverStateValue,
} from '../types';
import {
  buildDocumentPdfMarkup,
  createCaseResolverHistorySnapshotEntry,
  buildFileEditDraft,
  createId,
  isPathWithinFolder,
} from '../utils/caseResolverUtils';
import {
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';

const readCaptureApplyNowMs = (): number => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

const resolveCaptureApplyDurationMs = (startAtMs: number | null): number | null => {
  if (startAtMs === null) return null;
  const now = readCaptureApplyNowMs();
  return Math.round(now - startAtMs);
};

const sanitizeDocumentExportBaseName = (value: string): string => {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Document';
};

const buildDraftPdfPreviewMarkup = (
  draft: CaseResolverFileEditDraft,
  filemakerDatabase: FilemakerDatabase,
): string => {
  const addresserLabel =
    resolveFilemakerPartyLabel(filemakerDatabase, draft.addresser
      ? { ...draft.addresser, kind: draft.addresser.kind as FilemakerPartyKind }
      : null) ?? '';
  const addresseeLabel =
    resolveFilemakerPartyLabel(filemakerDatabase, draft.addressee
      ? { ...draft.addressee, kind: draft.addressee.kind as FilemakerPartyKind }
      : null) ?? '';
  return buildDocumentPdfMarkup({
    documentDate: draft.documentDate?.isoDate ?? '',
    documentPlace: draft.documentCity ?? null,
    addresserLabel,
    addresseeLabel,
    documentContent: draft.documentContentHtml ?? draft.documentContent ?? '',
  });
};

export type WorkspaceView = 'document' | 'relations';
export type EditorDetailsTab = 'document' | 'relations' | 'metadata' | 'revisions';

export function useAdminCaseResolverPageState() {
  const state: CaseResolverStateValue = useCaseResolverState();
  const router = useRouter();
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('document');
  const [captureApplyDiagnostics, setCaptureApplyDiagnostics] = useState<{
    status: 'idle' | 'success' | 'failed';
    stage: 'precheck' | 'mutation' | 'rebase' | null;
    message: string;
    targetFileId: string | null;
    resolvedTargetFileId: string | null;
    workspaceRevision: number;
    attempts: number;
    at: string;
    cleanupDurationMs?: number | null;
    mutationDurationMs?: number | null;
    totalDurationMs?: number | null;
  } | null>(null);
  
  const captureApplyInFlightRef = useRef(false);
  const captureMappingDismissedRef = useRef(false);
  const captureMappingDismissToastShownRef = useRef(false);
  const printInFlightRef = useRef(false);
  
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

  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [editorDetailsTab, setEditorDetailsTab] = useState<EditorDetailsTab>('document');
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [editorContentRevisionSeed, setEditorContentRevisionSeed] = useState(0);
  const editorSplitRef = useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scanDraftUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanDraftDropActive, setIsScanDraftDropActive] = useState(false);

  const activeCaseFile = useMemo(
    () => workspace.files.find(f => f.id === state.activeCaseId) ?? null,
    [state.activeCaseId, workspace.files]
  );

  const preserveWorkspaceView = useCallback(
    (view: WorkspaceView): void => {
      window.setTimeout((): void => {
        setWorkspaceView((current) => (current === view ? current : view));
      }, 0);
    },
    []
  );

  const createUniqueNodeFileAssetName = useCallback(
    (
      assets: CaseResolverAssetFile[],
      folder: string,
      baseName: string
    ): string => {
      const normalizedFolder = normalizeFolderPath(folder);
      const normalizedBaseName = baseName.trim() || 'New Node File';
      const namesInFolder = new Set(
        assets
          .filter((asset: CaseResolverAssetFile): boolean => asset.folder === normalizedFolder)
          .map((asset: CaseResolverAssetFile): string => asset.name.trim().toLowerCase())
      );
      if (!namesInFolder.has(normalizedBaseName.toLowerCase())) return normalizedBaseName;
      let index = 2;
      while (index < 10_000) {
        const candidate = `${normalizedBaseName} ${index}`;
        if (!namesInFolder.has(candidate.toLowerCase())) {
          return candidate;
        }
        index += 1;
      }
      return `${normalizedBaseName}-${createId('dup')}`;
    },
    []
  );

  const buildNodeFileSnapshotText = useCallback(
    (input: {
      graph: CaseResolverGraph;
      nodeId: string;
      sourceFileId: string | null;
      sourceFileName: string | null;
      sourceFileType: 'document' | 'scanfile' | null;
      sourceFolder: string | null;
      activeCanvasFileId: string;
    }): string => {
      const targetNode =
        input.graph.nodes.find((node) => node.id === input.nodeId) ?? null;
      const connectedEdges = input.graph.edges
        .filter((edge): boolean => edge.from === input.nodeId || edge.to === input.nodeId)
        .sort((left, right) => left.id.localeCompare(right.id));
      const relatedNodeIds = Array.from(
        new Set(
          connectedEdges.flatMap((edge): string[] => [edge.from ?? '', edge.to ?? ''])
        )
      )
        .filter((nodeId: string): boolean => nodeId !== input.nodeId && nodeId.length > 0)
        .sort((left: string, right: string) => left.localeCompare(right));
        
      const nodeFileMeta = (() => {
        if (!input.sourceFileId || !input.nodeId) return {};
        return {
          [input.nodeId]: {
            fileId: input.sourceFileId,
            fileType: input.sourceFileType === 'scanfile' ? 'scanfile' : 'document',
            fileName: input.sourceFileName ?? 'Linked document',
          },
        };
      })();

      return JSON.stringify(
        {
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          activeCanvasFileId: input.activeCanvasFileId,
          sourceFileId: input.sourceFileId,
          sourceFileName: input.sourceFileName,
          sourceFileType: input.sourceFileType,
          sourceFolder: input.sourceFolder,
          nodeId: input.nodeId,
          nodeMeta: input.graph.nodeMeta?.[input.nodeId] ?? null,
          relatedNodeIds,
          nodes: targetNode ? [targetNode] : [],
          edges: connectedEdges,
          nodeFileMeta,
        },
        null,
        2
      );
    },
    []
  );

  useEffect(() => {
    if (!editingDocumentDraft) return;
    setEditorWidth(null);
    setEditorDetailsTab('document');
    setEditorContentRevisionSeed((value) => value + 1);
  }, [editingDocumentDraft?.id]);

  const isEditorDraftDirty = useMemo(() => {
    if (!editingDocumentDraft) return false;
    const currentFile = workspace.files.find((file) => file.id === editingDocumentDraft.id);
    if (!currentFile) return false;
    return hasCaseResolverDraftMeaningfulChanges({
      draft: editingDocumentDraft,
      file: currentFile,
    });
  }, [editingDocumentDraft, workspace.files]);

  const caseTagPathById = useMemo(
    () => buildPathLabelMap(caseResolverTags),
    [caseResolverTags]
  );
  const caseIdentifierPathById = useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers),
    [caseResolverIdentifiers]
  );
  const caseCategoryPathById = useMemo(
    () => buildPathLabelMap(caseResolverCategories),
    [caseResolverCategories]
  );
  
  const caseTagOptions = useMemo(
    () => [
      { value: '__none__', label: caseResolverTags.length > 0 ? 'No tag' : 'No tags' },
      ...caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) ?? tag.label,
      })),
    ],
    [caseResolverTags, caseTagPathById]
  );
  
  const caseIdentifierOptions = useMemo(
    () => [
      {
        value: '__none__',
        label: caseResolverIdentifiers.length > 0 ? 'No case identifier' : 'No case identifiers',
      },
      ...caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) ?? identifier.label ?? identifier.name ?? '',
      })),
    ],
    [caseIdentifierPathById, caseResolverIdentifiers]
  );
  
  const caseCategoryOptions = useMemo(
    () => [
      { value: '__none__', label: caseResolverCategories.length > 0 ? 'No category' : 'No categories' },
      ...caseResolverCategories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) ?? category.name,
      })),
    ],
    [caseCategoryPathById, caseResolverCategories]
  );
  
  const caseReferenceOptions = useMemo(
    () =>
      workspace.files
        .filter((file) => file.fileType === 'case')
        .map((file) => ({
          value: file.id,
          label: file.folder ? `${file.name} (${file.folder})` : file.name,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [workspace.files]
  );
  
  const parentCaseOptions = useMemo(
    () => [{ value: '__none__', label: 'No parent (root case)' }, ...caseReferenceOptions],
    [caseReferenceOptions]
  );
  
  const partyOptions = useMemo(
    () => buildFilemakerPartyOptions(filemakerDatabase),
    [filemakerDatabase]
  );

  const [promptExploderProposalDraft, setPromptExploderProposalDraft] =
    useState<CaseResolverCaptureProposalState | null>(null);
    
  const captureProposalTargetFileName = useMemo(() => {
    if (!promptExploderProposalDraft) return null;
    const targetFile = workspace.files.find(
      (file) => file.id === promptExploderProposalDraft.targetFileId
    );
    return targetFile?.name ?? promptExploderProposalDraft.targetFileId;
  }, [promptExploderProposalDraft, workspace.files]);

  useEffect(() => {
    if (!isPromptExploderPartyProposalOpen) return;
    captureMappingDismissedRef.current = false;
    captureMappingDismissToastShownRef.current = false;
  }, [isPromptExploderPartyProposalOpen]);

  useEffect(() => {
    if (!isPromptExploderPartyProposalOpen || !promptExploderPartyProposal) {
      setPromptExploderProposalDraft(null);
      setCaptureApplyDiagnostics(null);
      return;
    }
    setCaptureApplyDiagnostics(null);
    setPromptExploderProposalDraft({
      targetFileId: promptExploderPartyProposal.targetFileId,
      addresser: promptExploderPartyProposal.addresser
        ? {
          ...promptExploderPartyProposal.addresser,
          candidate: { ...promptExploderPartyProposal.addresser.candidate },
          existingReference: promptExploderPartyProposal.addresser.existingReference
            ? { ...promptExploderPartyProposal.addresser.existingReference }
            : null,
        }
        : null,
      addressee: promptExploderPartyProposal.addressee
        ? {
          ...promptExploderPartyProposal.addressee,
          candidate: { ...promptExploderPartyProposal.addressee.candidate },
          existingReference: promptExploderPartyProposal.addressee.existingReference
            ? { ...promptExploderPartyProposal.addressee.existingReference }
            : null,
        }
        : null,
      documentDate: promptExploderPartyProposal.documentDate
        ? {
          ...promptExploderPartyProposal.documentDate,
        }
        : null,
    });
  }, [isPromptExploderPartyProposalOpen, promptExploderPartyProposal]);

  const handleClosePromptExploderProposalModal = useCallback((): void => {
    if (captureApplyInFlightRef.current || isApplyingPromptExploderPartyProposal) return;
    if (captureMappingDismissedRef.current) return;
    captureMappingDismissedRef.current = true;
    setIsPromptExploderPartyProposalOpen(false);
    setPromptExploderProposalDraft(null);
    setPromptExploderPartyProposal(null);
    setCaptureApplyDiagnostics(null);
    if (!captureMappingDismissToastShownRef.current) {
      captureMappingDismissToastShownRef.current = true;
      toast('Capture mapping dismissed. No party/city/date fields were changed.', {
        variant: 'info',
      });
    }
    logCaseResolverWorkspaceEvent({
      source: 'capture_mapping_apply',
      action: 'capture_mapping_dismissed',
      message: JSON.stringify({
        targetFileId: promptExploderProposalDraft?.targetFileId ?? null,
      }),
    });
  }, [
    isApplyingPromptExploderPartyProposal,
    promptExploderProposalDraft?.targetFileId,
    setIsPromptExploderPartyProposalOpen,
    setPromptExploderPartyProposal,
    toast,
  ]);

  const updatePromptExploderProposalAction = useCallback(
    (role: 'addresser' | 'addressee', action: CaseResolverCaptureAction): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current) return current;
        const roleProposal = current[role];
        if (!roleProposal) return current;
        return {
          ...current,
          [role]: {
            ...roleProposal,
            action,
          },
        };
      });
    },
    []
  );

  const updatePromptExploderProposalReference = useCallback(
    (role: 'addresser' | 'addressee', encodedReference: string): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current) return current;
        const roleProposal = current[role];
        if (!roleProposal) return current;
        return {
          ...current,
          [role]: {
            ...roleProposal,
            existingReference: decodeFilemakerPartyReference(encodedReference),
          },
        };
      });
    },
    []
  );

  const updatePromptExploderProposalDateAction = useCallback(
    (action: CaseResolverCaptureDocumentDateAction): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current?.documentDate) return current;
        return {
          ...current,
          documentDate: {
            ...current.documentDate,
            action,
          },
        };
      });
    },
    []
  );

  const handleApplyPromptExploderProposal = useCallback((): void => {
    const applyGuardReason = resolveCaptureMappingApplyGuardReason({
      modalOpen: isPromptExploderPartyProposalOpen,
      dismissed: captureMappingDismissedRef.current,
      hasDraft: Boolean(promptExploderProposalDraft),
      inFlight: captureApplyInFlightRef.current,
    });
    if (applyGuardReason) {
      if (applyGuardReason === 'modal_closed' || applyGuardReason === 'dismissed') {
        logCaseResolverWorkspaceEvent({
          source: 'capture_mapping_apply',
          action: 'capture_mapping_apply_blocked',
          message: JSON.stringify({
            reason: applyGuardReason,
            targetFileId: promptExploderProposalDraft?.targetFileId ?? null,
          }),
        });
      }
      return;
    }
    if (!promptExploderProposalDraft) {
      setIsPromptExploderPartyProposalOpen(false);
      return;
    }
    captureApplyInFlightRef.current = true;
    captureMappingDismissedRef.current = false;

    void (async (): Promise<void> => {
      setIsApplyingPromptExploderPartyProposal(true);
      try {
        const applyStartedAtMs = readCaptureApplyNowMs();
        let cleanupDurationMs: number | null = null;
        let mutationDurationMs: number | null = null;
        const requestedTargetFileId = promptExploderProposalDraft.targetFileId;
        const workspaceSnapshot = workspaceRef.current;
        const targetResolution = resolveCaptureTargetFile({
          workspaceFiles: workspaceSnapshot.files,
          proposalTargetFileId: requestedTargetFileId,
          contextFileId: null,
          editingDraftFileId: null,
        });
        const resolvedTargetFile = targetResolution.file;
        if (!resolvedTargetFile) {
          const precheckRevision = getCaseResolverWorkspaceRevision(workspaceSnapshot);
          setCaptureApplyDiagnostics({
            status: 'failed',
            stage: 'precheck',
            message: 'Capture target is missing before mutation.',
            targetFileId: requestedTargetFileId,
            resolvedTargetFileId: null,
            workspaceRevision: precheckRevision,
            attempts: 1,
            at: new Date().toISOString(),
            cleanupDurationMs,
            mutationDurationMs,
            totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
          });
          logCaseResolverWorkspaceEvent({
            source: 'capture_mapping_apply',
            action: 'capture_target_missing_precheck',
            message: JSON.stringify({
              requestedTargetFileId,
              proposalTargetFileId: promptExploderProposalDraft.targetFileId,
              editingDraftFileId: editingDocumentDraft?.id ?? null,
              activeFileId: workspaceSnapshot.activeFileId ?? null,
              workspaceRevision: precheckRevision,
            }),
          });
          toast('Capture mapping failed: target file missing (precheck).', {
            variant: 'warning',
          });
          return;
        }
        if (resolvedTargetFile.isLocked) {
          const workspaceRevision = getCaseResolverWorkspaceRevision(workspaceSnapshot);
          setCaptureApplyDiagnostics({
            status: 'failed',
            stage: 'precheck',
            message: 'Capture target is locked before mutation.',
            targetFileId: requestedTargetFileId,
            resolvedTargetFileId: resolvedTargetFile.id,
            workspaceRevision,
            attempts: 1,
            at: new Date().toISOString(),
            cleanupDurationMs,
            mutationDurationMs,
            totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
          });
          toast('Document is locked. Unlock it in Case Resolver before applying capture mapping.', {
            variant: 'warning',
          });
          return;
        }
        const targetFileId = resolvedTargetFile.id;
        let nextDatabase = filemakerDatabase;
        let shouldPersistFilemakerDatabase = false;
        let nextProposalState: CaseResolverCaptureProposalState = {
          targetFileId,
          addresser: promptExploderProposalDraft.addresser
            ? {
              ...promptExploderProposalDraft.addresser,
              candidate: { ...promptExploderProposalDraft.addresser.candidate },
              existingReference: promptExploderProposalDraft.addresser.existingReference
                ? { ...promptExploderProposalDraft.addresser.existingReference }
                : null,
            }
            : null,
          addressee: promptExploderProposalDraft.addressee
            ? {
              ...promptExploderProposalDraft.addressee,
              candidate: { ...promptExploderProposalDraft.addressee.candidate },
              existingReference: promptExploderProposalDraft.addressee.existingReference
                ? { ...promptExploderProposalDraft.addressee.existingReference }
                : null,
            }
            : null,
          documentDate: promptExploderProposalDraft.documentDate
            ? {
              ...promptExploderProposalDraft.documentDate,
            }
            : null,
        };

        const rolePatches: {
          addresser?: { kind: 'person' | 'organization'; id: string } | null;
          addressee?: { kind: 'person' | 'organization'; id: string } | null;
        } = {};
        const failedRoles: string[] = [];
        const acceptedRoles: string[] = [];

        const applyRole = (role: 'addresser' | 'addressee'): void => {
          const proposal = nextProposalState[role];
          if (!proposal) return;

          if (proposal.action === 'ignore' || proposal.action === 'keepText') {
            return;
          }

          const roleLabel = role === 'addresser' ? 'Addresser' : 'Addressee';
          const proposalSupportsMatchedReference =
            proposal.matchKind === 'party' || proposal.matchKind === 'party_and_address';

          if (proposal.action === 'useMatched') {
            if (!proposalSupportsMatchedReference) {
              failedRoles.push(`${roleLabel} (no matched Filemaker party reference)`);
              return;
            }
            rolePatches[role] = proposal.existingReference ?? null;
            acceptedRoles.push(roleLabel);
            return;
          }

          if (proposal.action !== 'createInFilemaker') {
            return;
          }

          const upsertResult = upsertFilemakerCaptureCandidate(nextDatabase, proposal.candidate);
          nextDatabase = upsertResult.database;
          if (upsertResult.createdAddress || upsertResult.createdParty) {
            shouldPersistFilemakerDatabase = true;
          }
          if (!upsertResult.reference) {
            failedRoles.push(`${roleLabel} (insufficient data to create Filemaker record)`);
            return;
          }

          rolePatches[role] = upsertResult.reference;
          acceptedRoles.push(roleLabel);
          const nextRoleProposal = nextProposalState[role];
          if (!nextRoleProposal) return;
          const nextMatchKind = upsertResult.addressId ? 'party_and_address' : 'party';
          nextProposalState = {
            ...nextProposalState,
            [role]: {
              ...nextRoleProposal,
              existingReference: upsertResult.reference,
              existingAddressId: upsertResult.addressId ?? nextRoleProposal.existingAddressId,
              matchKind: nextMatchKind,
              action: 'useMatched',
            },
          };
        };

        applyRole('addresser');
        applyRole('addressee');

        if (shouldPersistFilemakerDatabase) {
          try {
            await updateSetting.mutateAsync({
              key: FILEMAKER_DATABASE_KEY,
              value: JSON.stringify(normalizeFilemakerDatabase(nextDatabase)),
            });
            refetchSettingsStore();
          } catch (_error: unknown) {
            toast(
              _error instanceof Error
                ? _error.message
                : 'Failed to save Filemaker records for capture mapping.',
              { variant: 'error' }
            );
            return;
          }
        }

        const targetFile = resolvedTargetFile;
        const normalizeRolePatchReference = (
          reference: { kind: 'person' | 'organization'; id: string } | null | undefined
        ): { kind: 'person' | 'organization'; id: string } | null => {
          if (!reference) return null;
          const normalizedId = reference.id.trim();
          if (!normalizedId) return null;
          return {
            kind: reference.kind,
            id: normalizedId,
          };
        };
        const areRolePatchReferencesEqual = (
          left: { kind: 'person' | 'organization'; id: string } | null | undefined,
          right: { kind: 'person' | 'organization'; id: string } | null | undefined
        ): boolean => {
          const normalizedLeft = normalizeRolePatchReference(left);
          const normalizedRight = normalizeRolePatchReference(right);
          if (!normalizedLeft && !normalizedRight) return true;
          if (!normalizedLeft || !normalizedRight) return false;
          return (
            normalizedLeft.kind === normalizedRight.kind &&
            normalizedLeft.id === normalizedRight.id
          );
        };
        const acceptedAddresser = rolePatches.addresser !== undefined;
        const acceptedAddressee = rolePatches.addressee !== undefined;
        const nextAddresserReference = acceptedAddresser
          ? normalizeRolePatchReference(rolePatches.addresser ?? null)
          : null;
        const nextAddresseeReference = acceptedAddressee
          ? normalizeRolePatchReference(rolePatches.addressee ?? null)
          : null;
        const precheckShouldPatchAddresser =
          acceptedAddresser &&
          !areRolePatchReferencesEqual(targetFile.addresser, nextAddresserReference);
        const precheckShouldPatchAddressee =
          acceptedAddressee &&
          !areRolePatchReferencesEqual(targetFile.addressee, nextAddresseeReference);
        let appliedAddresserReferencePatch = false;
        let appliedAddresseeReferencePatch = false;
        let appliedDocumentDatePatch = false;
        let appliedDocumentCityPatch = false;
        let appliedExplodedCleanupPatch = false;
        const normalizeDocumentDateIso = (value: unknown): string => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const isoDate = (value as { isoDate?: unknown }).isoDate;
            return typeof isoDate === 'string' ? isoDate.trim() : '';
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
            if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
          }
          return '';
        };
        const normalizeDocumentCity = (value: unknown): string | null => {
          if (typeof value !== 'string') return null;
          const normalized = value.trim();
          return normalized.length > 0 ? normalized : null;
        };

        const dateProposal = nextProposalState.documentDate;
        const shouldAcceptDate =
          dateProposal?.action === 'useDetectedDate' &&
          dateProposal.isoDate.trim().length > 0;
        const acceptedDateValue = shouldAcceptDate
          ? dateProposal.isoDate.trim()
          : null;
        const acceptedCityValue = shouldAcceptDate
          ? normalizeDocumentCity(dateProposal?.city ?? dateProposal?.cityHint ?? null)
          : null;
        const acceptedDocumentDateValue =
          acceptedDateValue && dateProposal
            ? {
              ...dateProposal,
              isoDate: acceptedDateValue,
              city: acceptedCityValue ?? dateProposal.city ?? dateProposal.cityHint ?? null,
            }
            : null;
        const precheckShouldPatchDocumentDate =
          acceptedDateValue !== null &&
          normalizeDocumentDateIso(targetFile.documentDate) !== acceptedDateValue;
        const precheckShouldPatchDocumentCity =
          acceptedCityValue !== null &&
          normalizeDocumentCity(targetFile.documentCity) !==
            acceptedCityValue;
        const cleanupProposalState: CaseResolverCaptureProposalState = {
          ...nextProposalState,
          addresser: acceptedAddresser
            ? nextProposalState.addresser
            : nextProposalState.addresser
              ? { ...nextProposalState.addresser, action: 'keepText' }
              : null,
          addressee: acceptedAddressee
            ? nextProposalState.addressee
            : nextProposalState.addressee
              ? { ...nextProposalState.addressee, action: 'keepText' }
              : null,
          documentDate: shouldAcceptDate
            ? nextProposalState.documentDate
            : nextProposalState.documentDate
              ? { ...nextProposalState.documentDate, action: 'keepText' }
              : null,
        };

        const draftForTargetFile =
          editingDocumentDraft?.id === targetFileId ? editingDocumentDraft : null;
        const sourceExplodedContent = (() => {
          if (draftForTargetFile) {
            const draftActiveContent =
              typeof draftForTargetFile.documentContent === 'string'
                ? draftForTargetFile.documentContent
                : '';
            const draftExplodedContent =
              typeof draftForTargetFile.explodedDocumentContent === 'string'
                ? draftForTargetFile.explodedDocumentContent
                : '';
            if (
              draftForTargetFile.activeDocumentVersion === 'exploded' &&
              draftActiveContent.trim().length > 0
            ) {
              return draftActiveContent;
            }
            if (draftExplodedContent.trim().length > 0) {
              return draftExplodedContent;
            }
          }
          if (targetFile.explodedDocumentContent?.trim().length) {
            return targetFile.explodedDocumentContent;
          }
          if (targetFile.activeDocumentVersion === 'exploded') {
            return targetFile.documentContent;
          }
          return '';
        })();
        const cleanupStartedAtMs = readCaptureApplyNowMs();
        const hasSourceExplodedContent = (sourceExplodedContent ?? '').trim().length > 0;
        const cleanupResult =
          hasSourceExplodedContent
            ? stripAcceptedCaptureContentFromTextWithReport(
              sourceExplodedContent ?? '',
              cleanupProposalState
            )
            : {
              text: sourceExplodedContent ?? '',
              report: {
                changed: false,
                sourceWasHtml: false,
                removedAddressLineCount: 0,
                removedAddresserLineCount: 0,
                removedAddresseeLineCount: 0,
                removedDateLineCount: 0,
              },
            };
        cleanupDurationMs = resolveCaptureApplyDurationMs(cleanupStartedAtMs);
        const cleanedExplodedContent = cleanupResult.text;
        const hasExplodedCleanup = cleanupResult.report.changed;
        const cleanupMissedAcceptedRoles: string[] = [];
        if (hasSourceExplodedContent) {
          if (acceptedAddresser && cleanupResult.report.removedAddresserLineCount === 0) {
            cleanupMissedAcceptedRoles.push('addresser');
          }
          if (acceptedAddressee && cleanupResult.report.removedAddresseeLineCount === 0) {
            cleanupMissedAcceptedRoles.push('addressee');
          }
        }
        logCaseResolverWorkspaceEvent({
          source: 'case_view',
          action: 'capture_cleanup_evaluated',
          message: JSON.stringify({
            targetFileId,
            appliedAddresser: acceptedAddresser,
            appliedAddressee: acceptedAddressee,
            changedAddresserReference: precheckShouldPatchAddresser,
            changedAddresseeReference: precheckShouldPatchAddressee,
            appliedDate: shouldAcceptDate,
            appliedCity: acceptedCityValue !== null,
            cleanupChanged: hasExplodedCleanup,
            cleanupSourceWasHtml: cleanupResult.report.sourceWasHtml,
            removedAddressLineCount: cleanupResult.report.removedAddressLineCount,
            removedAddresserLineCount: cleanupResult.report.removedAddresserLineCount,
            removedAddresseeLineCount: cleanupResult.report.removedAddresseeLineCount,
            removedDateLineCount: cleanupResult.report.removedDateLineCount,
            cleanupMissedAcceptedRoles,
            cleanupDurationMs,
          }),
        });
        const cleanedExplodedCanonical = hasExplodedCleanup
          ? deriveDocumentContentSync({
            mode: 'wysiwyg',
            value: (cleanedExplodedContent ?? ''),
            previousMarkdown:
              draftForTargetFile?.documentContentMarkdown ?? targetFile.documentContentMarkdown,
            previousHtml:
              draftForTargetFile?.documentContentHtml ?? targetFile.documentContentHtml,
          })
          : null;
        const cleanedExplodedStored = cleanedExplodedCanonical
          ? toStorageDocumentValue(cleanedExplodedCanonical)
          : null;

        const shouldAttemptPersistPatch =
          acceptedAddresser ||
          acceptedAddressee ||
          acceptedDateValue !== null ||
          acceptedCityValue !== null ||
          hasExplodedCleanup;
        let captureApplyAttempts = 1;
        let mutationResult: { ok: boolean; stage: CaseResolverFileMutationStage; fileFound: boolean; resolvedTargetFileId: string | null } | null = null;
        const mutationStartedAtMs = shouldAttemptPersistPatch ? readCaptureApplyNowMs() : null;

        if (shouldAttemptPersistPatch) {
          const now = new Date().toISOString();
          const runCaptureMutation = ({
            mutationTargetFileId,
            mutationSource,
            mutationPrecheckFiles,
          }: {
            mutationTargetFileId: string;
            mutationSource: string;
            mutationPrecheckFiles: typeof workspace.files;
          }): { ok: boolean; stage: CaseResolverFileMutationStage; fileFound: boolean; resolvedTargetFileId: string | null } => {
            let mutationResultInner!: { ok: boolean; stage: CaseResolverFileMutationStage; fileFound: boolean; resolvedTargetFileId: string | null };
            flushSync(() => {
              mutationResultInner = applyCaseResolverFileMutationAndRebaseDraft({
                fileId: mutationTargetFileId,
                updateWorkspace,
                setEditingDocumentDraft,
                fallbackFileOnMissing: null,
                allowFallbackOnMissing: false,
                precheckWorkspaceFiles: mutationPrecheckFiles,
                source: mutationSource,
                persistToast: 'Capture mapping applied.',
                skipNormalization: true,
                mutate: (file): Partial<CaseResolverFile> | null => {
                  if (file.isLocked) return null;
                  const fileShouldPatchAddresser =
                    acceptedAddresser &&
                    !areRolePatchReferencesEqual(file.addresser, nextAddresserReference);
                  const fileShouldPatchAddressee =
                    acceptedAddressee &&
                    !areRolePatchReferencesEqual(file.addressee, nextAddresseeReference);
                  const fileShouldPatchDocumentDate =
                    acceptedDateValue !== null &&
                    normalizeDocumentDateIso(file.documentDate) !== acceptedDateValue;
                  const fileShouldPatchDocumentCity =
                    acceptedCityValue !== null &&
                    normalizeDocumentCity(file.documentCity) !==
                      acceptedCityValue;
                  const fileShouldApplyExplodedCleanup =
                    hasExplodedCleanup && Boolean(cleanedExplodedCanonical && cleanedExplodedStored);
                  const fileShouldPersistPatch =
                    fileShouldPatchAddresser ||
                    fileShouldPatchAddressee ||
                    fileShouldPatchDocumentDate ||
                    fileShouldPatchDocumentCity ||
                    fileShouldApplyExplodedCleanup;
                  if (!fileShouldPersistPatch) return null;
                  appliedAddresserReferencePatch =
                    appliedAddresserReferencePatch || fileShouldPatchAddresser;
                  appliedAddresseeReferencePatch =
                    appliedAddresseeReferencePatch || fileShouldPatchAddressee;
                  appliedDocumentDatePatch =
                    appliedDocumentDatePatch || fileShouldPatchDocumentDate;
                  appliedDocumentCityPatch =
                    appliedDocumentCityPatch || fileShouldPatchDocumentCity;
                  appliedExplodedCleanupPatch =
                    appliedExplodedCleanupPatch || fileShouldApplyExplodedCleanup;
                  const nextContentVersion = file.documentContentVersion + 1;
                  const currentSnapshot = hasExplodedCleanup
                    ? createCaseResolverHistorySnapshotEntry({
                      savedAt: now,
                      documentContentVersion: file.documentContentVersion,
                      activeDocumentVersion: file.activeDocumentVersion,
                      editorType: file.editorType,
                      documentContent: file.documentContent,
                      documentContentMarkdown: file.documentContentMarkdown,
                      documentContentHtml: file.documentContentHtml,
                      documentContentPlainText: file.documentContentPlainText,
                    })
                    : null;
                  const nextDocumentHistory = currentSnapshot
                    ? [currentSnapshot, ...file.documentHistory].slice(0, 120)
                    : file.documentHistory;
                  return {
                    ...(fileShouldPatchAddresser ? { addresser: rolePatches.addresser ?? null } : {}),
                    ...(fileShouldPatchAddressee ? { addressee: rolePatches.addressee ?? null } : {}),
                    ...(fileShouldPatchDocumentDate && acceptedDocumentDateValue
                      ? { documentDate: acceptedDocumentDateValue }
                      : {}),
                    ...(fileShouldPatchDocumentCity ? { documentCity: acceptedCityValue } : {}),
                    ...(fileShouldApplyExplodedCleanup && cleanedExplodedCanonical && cleanedExplodedStored
                      ? {
                        explodedDocumentContent: cleanedExplodedStored,
                        ...(file.activeDocumentVersion === 'exploded'
                          ? {
                            editorType: cleanedExplodedCanonical.mode,
                            documentContentFormatVersion: 1,
                            documentContent: cleanedExplodedStored,
                            documentContentMarkdown: cleanedExplodedCanonical.markdown,
                            documentContentHtml: cleanedExplodedCanonical.html,
                            documentContentPlainText: cleanedExplodedCanonical.plainText,
                            documentConversionWarnings: cleanedExplodedCanonical.warnings,
                            lastContentConversionAt: now,
                          }
                          : {}),
                        documentHistory: nextDocumentHistory,
                      }
                      : {}),
                    documentContentVersion: nextContentVersion,
                    updatedAt: now,
                  } as Partial<CaseResolverFile>;
                },
              });
            });
            return mutationResultInner;
          };

          let mutationTargetFileId = targetFileId;
          mutationResult = runCaptureMutation({
            mutationTargetFileId,
            mutationSource: 'capture_mapping_apply',
            mutationPrecheckFiles: workspaceRef.current.files,
          });

          if (!mutationResult.ok && mutationResult.stage === 'mutation') {
            const retryWorkspaceSnapshot = workspaceRef.current;
            const retryTargetResolution = resolveCaptureTargetFile({
              workspaceFiles: retryWorkspaceSnapshot.files,
              proposalTargetFileId: mutationTargetFileId,
              contextFileId: null,
              editingDraftFileId: null,
            });
            if (retryTargetResolution.file) {
              captureApplyAttempts = 2;
              mutationTargetFileId = retryTargetResolution.file.id;
              logCaseResolverWorkspaceEvent({
                source: 'capture_mapping_apply',
                action: 'capture_target_missing_mutation_retrying',
                message: JSON.stringify({
                  targetFileId,
                  retryTargetFileId: mutationTargetFileId,
                  workspaceRevision: getCaseResolverWorkspaceRevision(retryWorkspaceSnapshot),
                }),
              });
              mutationResult = runCaptureMutation({
                mutationTargetFileId,
                mutationSource: 'capture_mapping_apply_retry',
                mutationPrecheckFiles: retryWorkspaceSnapshot.files,
              });
            }
          }

          if (!mutationResult.ok) {
            mutationDurationMs = resolveCaptureApplyDurationMs(mutationStartedAtMs);
            const failureStage = mutationResult.stage ?? 'mutation';
            const workspaceRevision = getCaseResolverWorkspaceRevision(workspaceRef.current);
            const failureMessage =
              failureStage === 'precheck'
                ? 'Capture target missing during precheck.'
                : 'Capture target missing during workspace mutation.';
            setCaptureApplyDiagnostics({
              status: 'failed',
              stage: failureStage,
              message: failureMessage,
              targetFileId,
              resolvedTargetFileId: mutationResult.resolvedTargetFileId,
              workspaceRevision,
              attempts: captureApplyAttempts,
              at: new Date().toISOString(),
              cleanupDurationMs,
              mutationDurationMs,
              totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
            });
            logCaseResolverWorkspaceEvent({
              source: 'capture_mapping_apply',
              action: failureStage === 'precheck'
                ? 'capture_target_missing_precheck'
                : 'capture_target_missing_mutation',
              message: JSON.stringify({
                targetFileId,
                proposalTargetFileId: promptExploderProposalDraft.targetFileId,
                mutationResult,
                workspaceRevision,
                attempts: captureApplyAttempts,
                cleanupDurationMs,
                mutationDurationMs,
                totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
              }),
            });
            toast(
              failureStage === 'precheck'
                ? 'Capture mapping failed: target file missing (precheck).'
                : (
                  captureApplyAttempts > 1
                    ? 'Capture mapping failed: target file missing during apply (after retry).'
                    : 'Capture mapping failed: target file missing during apply.'
                ),
              {
                variant: 'warning',
              }
            );
            return;
          }
          if (!mutationResult.fileFound) {
            mutationDurationMs = resolveCaptureApplyDurationMs(mutationStartedAtMs);
            setCaptureApplyDiagnostics({
              status: 'failed',
              stage: 'rebase',
              message: 'Capture target missing during draft rebase.',
              targetFileId,
              resolvedTargetFileId: mutationResult.resolvedTargetFileId,
              workspaceRevision: getCaseResolverWorkspaceRevision(workspaceRef.current),
              attempts: captureApplyAttempts,
              at: new Date().toISOString(),
              cleanupDurationMs,
              mutationDurationMs,
              totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
            });
            toast('Capture mapping failed: target file missing during draft rebase.', {
              variant: 'warning',
            });
            return;
          }
          mutationDurationMs = resolveCaptureApplyDurationMs(mutationStartedAtMs);
        }

        const postMutationFile = workspaceRef.current.files.find((f) => f.id === targetFileId) ?? null;
        if (postMutationFile && postMutationFile.fileType !== 'case') {
          const freshDraft = buildFileEditDraft(postMutationFile);
          setEditingDocumentDraft(freshDraft);
          setEditorContentRevisionSeed((v) => v + 1);
        }
        refetchSettingsStore();

        setPromptExploderPartyProposal(nextProposalState);
        setPromptExploderProposalDraft(nextProposalState);
        const totalDurationMs = resolveCaptureApplyDurationMs(applyStartedAtMs);
        logCaseResolverWorkspaceEvent({
          source: 'capture_mapping_apply',
          action: 'capture_mapping_apply_timing',
          message: JSON.stringify({
            targetFileId,
            attempts: captureApplyAttempts,
            shouldPersistPatch: shouldAttemptPersistPatch,
            precheckShouldPatchAddresser,
            precheckShouldPatchAddressee,
            precheckShouldPatchDocumentDate,
            precheckShouldPatchDocumentCity,
            appliedAddresserReferencePatch,
            appliedAddresseeReferencePatch,
            appliedDocumentDatePatch,
            appliedDocumentCityPatch,
            appliedExplodedCleanupPatch,
            cleanupDurationMs,
            mutationDurationMs,
            totalDurationMs,
          }),
        });
        setCaptureApplyDiagnostics({
          status: 'success',
          stage: null,
          message: 'Capture mapping applied successfully.',
          targetFileId,
          resolvedTargetFileId: targetFileId,
          workspaceRevision: getCaseResolverWorkspaceRevision(workspaceRef.current),
          attempts: captureApplyAttempts,
          at: new Date().toISOString(),
          cleanupDurationMs,
          mutationDurationMs,
          totalDurationMs,
        });

        if (failedRoles.length > 0) {
          toast(
            `Capture mapping partially applied. Could not apply: ${failedRoles.join(', ')}.`,
            { variant: 'warning' }
          );
          return;
        }

        const changedPartyRoles: string[] = [];
        if (appliedAddresserReferencePatch) changedPartyRoles.push('Addresser');
        if (appliedAddresseeReferencePatch) changedPartyRoles.push('Addressee');
        setIsPromptExploderPartyProposalOpen(false);
        if (
          changedPartyRoles.length > 0 ||
          appliedDocumentDatePatch ||
          appliedDocumentCityPatch ||
          appliedExplodedCleanupPatch
        ) {
          const successParts: string[] = [];
          if (changedPartyRoles.length > 0) successParts.push('document parties');
          if (appliedDocumentDatePatch) successParts.push('document date');
          if (appliedDocumentCityPatch) successParts.push('city');
          if (appliedExplodedCleanupPatch) successParts.push('reassembled text cleanup');
          toast(`Capture mapping applied to ${successParts.join(', ')}.`, { variant: 'success' });
          if (cleanupMissedAcceptedRoles.length > 0) {
            toast(
              `Capture cleanup removed no header lines for: ${cleanupMissedAcceptedRoles.join(', ')}.`,
              { variant: 'warning' }
            );
          }
          return;
        }
        if (acceptedRoles.length > 0) {
          toast('Capture mapping accepted, but document party fields were unchanged.', {
            variant: 'info',
          });
          if (cleanupMissedAcceptedRoles.length > 0) {
            toast(
              `Capture cleanup removed no header lines for: ${cleanupMissedAcceptedRoles.join(', ')}.`,
              { variant: 'warning' }
            );
          }
          return;
        }
        if (shouldPersistFilemakerDatabase) {
          toast('Filemaker records created. No document party fields were changed.', {
            variant: 'info',
          });
          return;
        }
        toast('No database mapping selected. Document parties were not changed.', {
          variant: 'info',
        });
      } finally {
        setIsApplyingPromptExploderPartyProposal(false);
        captureApplyInFlightRef.current = false;
      }
    })();
  }, [
    editingDocumentDraft?.id,
    filemakerDatabase,
    isPromptExploderPartyProposalOpen,
    promptExploderPartyProposal,
    promptExploderProposalDraft,
    refetchSettingsStore,
    setEditingDocumentDraft,
    setIsApplyingPromptExploderPartyProposal,
    setIsPromptExploderPartyProposalOpen,
    setPromptExploderProposalDraft,
    setPromptExploderPartyProposal,
    toast,
    updateSetting,
    updateWorkspace,
    workspaceRef,
  ]);

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

  const handleOpenPromptExploderForDraft = useCallback((): void => {
    if (!editingDocumentDraft) return;
    if (editingDocumentDraft.isLocked) {
      toast('Document is locked. Unlock it in Case Resolver before opening Prompt Exploder.', {
        variant: 'warning',
      });
      return;
    }
    const promptExploderSessionId = createId('case-prompt-session');
    const promptSource = (() => {
      const sourceHtml = (
        typeof editingDocumentDraft.documentContentHtml === 'string' &&
        editingDocumentDraft.documentContentHtml.trim().length > 0
      )
        ? editingDocumentDraft.documentContentHtml
        : ensureSafeDocumentHtml(editingDocumentDraft.documentContent ?? '');
      const canonical = deriveDocumentContentSync({
        mode: 'wysiwyg',
        value: sourceHtml,
        previousMarkdown: editingDocumentDraft.documentContentMarkdown ?? '',
        previousHtml: editingDocumentDraft.documentContentHtml ?? '',
      });
      return (
        canonical.plainText ||
        editingDocumentDraft.documentContentPlainText ||
        editingDocumentDraft.documentContent ||
        editingDocumentDraft.documentContentMarkdown ||
        ''
      ).trim();
    })();
    if (!promptSource) {
      toast('Add document content before opening Prompt Exploder.', { variant: 'warning' });
      return;
    }

    savePromptExploderDraftPromptFromCaseResolver(promptSource, {
      fileId: editingDocumentDraft.id,
      fileName: editingDocumentDraft.name?.trim() || editingDocumentDraft.id,
      sessionId: promptExploderSessionId,
      documentVersionAtStart: editingDocumentDraft.documentContentVersion,
    });
    const returnTo = `/admin/case-resolver?openEditor=1&fileId=${encodeURIComponent(
      editingDocumentDraft.id
    )}&promptExploderSessionId=${encodeURIComponent(promptExploderSessionId)}`;
    router.push(
      `/admin/prompt-exploder?returnTo=${encodeURIComponent(returnTo)}&sessionId=${encodeURIComponent(promptExploderSessionId)}`
    );
  }, [editingDocumentDraft, router, toast]);

  const handleCopyDraftFileId = useCallback(async (): Promise<void> => {
    if (!editingDocumentDraft) return;
    try {
      await navigator.clipboard.writeText(editingDocumentDraft.id);
      toast('File ID copied to clipboard.', { variant: 'success' });
    } catch (_error: unknown) {
      toast('Failed to copy file ID.', { variant: 'error' });
    }
  }, [editingDocumentDraft, toast]);

  const handlePreviewDraftPdf = useCallback((): void => {
    if (!editingDocumentDraft) return;
    try {
      const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft, filemakerDatabase);
      if (typeof window === 'undefined') return;
      const previewBlob = new Blob([markup], { type: 'text/html;charset=utf-8' });
      const previewUrl = URL.createObjectURL(previewBlob);
      const previewWindow = window.open(previewUrl, '_blank');
      if (!previewWindow) {
        URL.revokeObjectURL(previewUrl);
        throw new Error('Preview popup was blocked by the browser.');
      }
      window.setTimeout((): void => {
        URL.revokeObjectURL(previewUrl);
      }, 120_000);
    } catch (_error: unknown) {
      toast(
        _error instanceof Error ? _error.message : 'Failed to generate PDF preview.',
        { variant: 'error' }
      );
    }
  }, [editingDocumentDraft, toast]);

  const printDocumentMarkup = useCallback((markup: string): void => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (printInFlightRef.current) return;
    printInFlightRef.current = true;
    const frame = document.createElement('iframe');
    let hasTriggeredPrint = false;
    const releasePrintLockTimeout = window.setTimeout((): void => {
      printInFlightRef.current = false;
    }, 10_000);
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';

    const cleanup = (): void => {
      window.setTimeout((): void => {
        window.clearTimeout(releasePrintLockTimeout);
        printInFlightRef.current = false;
        if (frame.parentNode) {
          frame.parentNode.removeChild(frame);
        }
      }, 300);
    };

    frame.onload = (): void => {
      if (hasTriggeredPrint) return;
      hasTriggeredPrint = true;
      window.setTimeout((): void => {
        const frameWindow = frame.contentWindow;
        if (!frameWindow) {
          toast('Failed to open the print dialog.', { variant: 'error' });
          cleanup();
          return;
        }
        try {
          frameWindow.focus();
          frameWindow.print();
        } catch (_error: unknown) {
          toast('Failed to open the print dialog.', { variant: 'error' });
        }
        cleanup();
      }, 120);
    };

    frame.srcdoc = markup;
    document.body.appendChild(frame);
  }, [toast]);

  const handlePrintDraftDocument = useCallback((): void => {
    if (!editingDocumentDraft) return;
    try {
      const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft, filemakerDatabase);
      printDocumentMarkup(markup);
    } catch (_error: unknown) {
      toast(
        _error instanceof Error ? _error.message : 'Failed to generate printable document.',
        { variant: 'error' }
      );
    }
  }, [editingDocumentDraft, printDocumentMarkup, toast]);

  const handleExportDraftPdf = useCallback(async (): Promise<void> => {
    if (!editingDocumentDraft) return;
    try {
      const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft, filemakerDatabase);
      const documentBaseName = sanitizeDocumentExportBaseName(
        editingDocumentDraft.name || 'Case Resolver Document'
      );
      const response = await fetch('/api/case-resolver/documents/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: markup,
          filename: `${documentBaseName}.pdf`,
        }),
      });
      if (!response.ok) {
        let message = `Failed to export PDF (${response.status}).`;
        try {
          const payload = (await response.json()) as {
            error?: { message?: string };
            message?: string;
          };
          message = payload.error?.message ?? payload.message ?? message;
        } catch (_error: unknown) {
          // keep fallback message
        }
        throw new Error(message);
      }
      const pdfBlob = await response.blob();
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${documentBaseName}.pdf`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout((): void => {
        URL.revokeObjectURL(downloadUrl);
      }, 500);
      toast('PDF exported.', { variant: 'success' });
    } catch (_error: unknown) {
      toast(
        _error instanceof Error ? _error.message : 'Failed to export PDF.',
        { variant: 'error' }
      );
    }
  }, [editingDocumentDraft, toast]);

  const handleTriggerScanDraftUpload = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    if (editingDocumentDraft.isLocked) return;
    if (isUploadingScanDraftFiles) return;
    scanDraftUploadInputRef.current?.click();
  }, [editingDocumentDraft, isUploadingScanDraftFiles]);

  const uploadScanDraftFiles = useCallback(
    (files: File[]): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (editingDocumentDraft.isLocked) {
        toast('Document is locked. Unlock it before uploading files.', { variant: 'warning' });
        return;
      }
      if (files.length === 0) return;
      void handleUploadScanFiles(editingDocumentDraft.id, files).catch((_error: unknown) => {
        toast(
          _error instanceof Error ? _error.message : 'Failed to upload scan images.',
          { variant: 'error' }
        );
      });
    },
    [editingDocumentDraft, handleUploadScanFiles, toast]
  );

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      const normalizedSourceFolder = normalizeFolderPath(folderPath);
      if (!normalizedSourceFolder) return;
      const normalizedTargetFolder = normalizeFolderPath(targetFolder);
      const sourceFolderName = normalizedSourceFolder.includes('/')
        ? normalizedSourceFolder.slice(normalizedSourceFolder.lastIndexOf('/') + 1)
        : normalizedSourceFolder;
      const nextRootFolder = normalizeFolderPath(
        normalizedTargetFolder ? `${normalizedTargetFolder}/${sourceFolderName}` : sourceFolderName
      );
      if (!nextRootFolder || nextRootFolder === normalizedSourceFolder) {
        return;
      }
      await handleRenameFolder(normalizedSourceFolder, nextRootFolder);
    },
    [handleRenameFolder]
  );

  const handleToggleFolderLock = useCallback(
    (folderPath: string): void => {
      const normalizedFolderPath = normalizeFolderPath(folderPath);
      if (!normalizedFolderPath) return;
      const folderFiles = workspace.files.filter((file) =>
        isPathWithinFolder(file.folder, normalizedFolderPath)
      );
      const shouldLock = folderFiles.some((file) => !file.isLocked);
      updateWorkspace(
        (current) => {
          const folderFilesInner = current.files.filter((file) =>
            isPathWithinFolder(file.folder, normalizedFolderPath)
          );
          if (folderFilesInner.length === 0) return current;
          const now = new Date().toISOString();
          let changed = false;
          const nextFiles = current.files.map((file) => {
            if (!isPathWithinFolder(file.folder, normalizedFolderPath)) return file;
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
        if (!isPathWithinFolder(current.folder, normalizedFolderPath)) return current;
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
        (current) => {
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
      const viewBeforeDelete = workspaceView;
      const runDelete = (): void => {
        updateWorkspace(
          (current) => {
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
        preserveWorkspaceView(viewBeforeDelete);
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
      preserveWorkspaceView,
      selectedFileId,
      setEditingDocumentDraft,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      updateWorkspace,
      workspace.files,
      workspaceView,
    ]
  );

  const handleDeleteAsset = useCallback(
    (assetId: string): void => {
      const target = workspace.assets.find((asset) => asset.id === assetId);
      if (!target) return;

      const viewBeforeDelete = workspaceView;
      const runDelete = (): void => {
        updateWorkspace(
          (current) => {
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
        preserveWorkspaceView(viewBeforeDelete);
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
      preserveWorkspaceView,
      selectedAssetId,
      setSelectedAssetId,
      setSelectedFolderPath,
      updateWorkspace,
      workspace.assets,
      workspaceView,
    ]
  );

  const handleGraphChange = useCallback(
    (nextGraph: CaseResolverGraph): void => {
      updateWorkspace((current) => {
        if (!current.activeFileId) return current;
        const activeFileIdx = current.files.findIndex((file) => file.id === current.activeFileId);
        if (activeFileIdx < 0) return current;
        const activeFileLocal = current.files[activeFileIdx];
        if (!activeFileLocal?.graph) return current;
        if (activeFileLocal.isLocked) return current;

        const activeGraph = activeFileLocal.graph;
        const previousSourceFileIdByNode = activeGraph.documentSourceFileIdByNode ?? {};
        const nextSourceFileIdByNode = nextGraph.documentSourceFileIdByNode ?? {};
        const nextNodeIds = new Set(
          nextGraph.nodes
            .map((node) => node.id)
            .filter((nodeId: string): boolean => typeof nodeId === 'string' && nodeId.trim().length > 0)
        );
        const filesById = new Map(current.files.map((file) => [file.id, file]));
        const existingNodeFileMap = activeGraph.nodeFileAssetIdByNode ?? {};
        const nextNodeFileMap: Record<string, string> = {};
        Object.entries(existingNodeFileMap).forEach(([nodeId, assetId]: [string, string]): void => {
          const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
          if (!normalizedAssetId) return;
          if (!nextNodeIds.has(nodeId)) return;
          nextNodeFileMap[nodeId] = normalizedAssetId;
        });

        let nextAssets = current.assets;
        let assetsChanged = false;
        const now = new Date().toISOString();

        const createNodeFileAssetForNode = (nodeId: string, sourceFileId: string): void => {
          if (nextNodeFileMap[nodeId]) return;
          const sourceFile = filesById.get(sourceFileId) ?? null;
          const normalizedFolder = normalizeFolderPath(sourceFile?.folder ?? activeFileLocal.folder ?? '');
          const baseName =
            `${(sourceFile?.name ?? 'Document').trim() || 'Document'} Node File`;
          const name = createUniqueNodeFileAssetName(nextAssets, normalizedFolder, baseName);
          const createdAssetId = createId('asset');
          const snapshot = buildNodeFileSnapshotText({
            graph: nextGraph,
            nodeId,
            sourceFileId,
            sourceFileName: sourceFile?.name ?? null,
            sourceFileType: sourceFile?.fileType === 'scanfile' ? 'scanfile' : 'document',
            sourceFolder: sourceFile?.folder ?? null,
            activeCanvasFileId: activeFileLocal.id,
          });
          const createdAsset = createCaseResolverAssetFile({
            id: createdAssetId,
            name,
            folder: normalizedFolder,
            kind: 'node_file',
            sourceFileId,
            textContent: snapshot,
            description: 'Auto-created from canvas document drop.',
          });
          nextAssets = [...nextAssets, createdAsset];
          nextNodeFileMap[nodeId] = createdAssetId;
          assetsChanged = true;
        };

        Object.entries(nextSourceFileIdByNode).forEach(([nodeId, sourceFileId]: [string, string]): void => {
          if (!nextNodeIds.has(nodeId)) return;
          const normalizedSourceFileId =
            typeof sourceFileId === 'string' ? sourceFileId.trim() : '';
          if (!normalizedSourceFileId) return;
          const hadPreviousSource = Boolean(previousSourceFileIdByNode[nodeId]?.trim());
          if (hadPreviousSource) return;
          createNodeFileAssetForNode(nodeId, normalizedSourceFileId);
        });

        Object.entries({ ...nextNodeFileMap }).forEach(([nodeId, assetId]: [string, string]): void => {
          const normalizedNodeId = typeof nodeId === 'string' ? nodeId.trim() : '';
          const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
          if (!normalizedNodeId || !normalizedAssetId) {
            delete nextNodeFileMap[nodeId];
            return;
          }
          if (!nextNodeIds.has(normalizedNodeId)) {
            delete nextNodeFileMap[nodeId];
            return;
          }
          const hasMappedAsset = nextAssets.some(
            (asset: CaseResolverAssetFile): boolean =>
              asset.id === normalizedAssetId && asset.kind === 'node_file'
          );
          if (!hasMappedAsset) {
            delete nextNodeFileMap[nodeId];
          }
        });

        const nextNodeFileMapKeys = Object.keys(nextNodeFileMap);
        const normalizedNodeFileMap =
          nextNodeFileMapKeys.length > 0 ? nextNodeFileMap : undefined;
        const currentComparableGraph = {
          ...activeGraph,
          ...(activeGraph.nodeFileAssetIdByNode &&
          Object.keys(activeGraph.nodeFileAssetIdByNode).length > 0
            ? { nodeFileAssetIdByNode: activeGraph.nodeFileAssetIdByNode }
            : {}),
        };
        const nextComparableGraph = {
          ...nextGraph,
          ...(normalizedNodeFileMap ? { nodeFileAssetIdByNode: normalizedNodeFileMap } : {}),
        };
        const graphChanged =
          stableStringify(currentComparableGraph) !== stableStringify(nextComparableGraph);

        if (!graphChanged && !assetsChanged) return current;

        const nextFiles = graphChanged
          ? current.files.map((file) => {
            if (file.id !== activeFileLocal.id) return file;
            return {
              ...file,
              graph: nextComparableGraph,
              updatedAt: now,
            };
          })
          : current.files;

        return {
          ...current,
          files: nextFiles,
          assets: assetsChanged ? nextAssets : current.assets,
          folders: assetsChanged
            ? normalizeFolderPaths([
              ...current.folders,
              ...nextAssets.map((asset: CaseResolverAssetFile): string => asset.folder),
            ])
            : current.folders,
        };
      });
    },
    [buildNodeFileSnapshotText, createUniqueNodeFileAssetName, updateWorkspace]
  );

  const handleUpdateActiveCaseMetadata = useCallback(
    (
      patch: Partial<
        Pick<
          CaseResolverFile,
          | 'name'
          | 'parentCaseId'
          | 'referenceCaseIds'
          | 'tagId'
          | 'caseIdentifierId'
          | 'categoryId'
          | 'caseStatus'
        >
      >,
    ): void => {
      if (!activeCaseFile) return;
      if (activeCaseFile.isLocked) return;

      updateWorkspace(
        (current) => {
          const currentCase = current.files.find(
            (file: CaseResolverFile): boolean =>
              file.id === activeCaseFile.id && file.fileType === 'case',
          );
          if (!currentCase || currentCase.isLocked) return current;

          const hasNamePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'name',
          );
          const hasParentCasePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'parentCaseId',
          );
          const hasReferencePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'referenceCaseIds',
          );
          const hasTagPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'tagId',
          );
          const hasCaseIdentifierPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'caseIdentifierId',
          );
          const hasCategoryPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'categoryId',
          );
          const hasCaseStatusPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'caseStatus',
          );

          const nextName = hasNamePatch
            ? patch.name?.trim() || currentCase.name || 'Untitled Case'
            : currentCase.name;
          const rawParentCaseId = hasParentCasePatch
            ? (patch.parentCaseId ?? null)
            : currentCase.parentCaseId;
          const nextParentCaseId = rawParentCaseId?.trim()
            ? rawParentCaseId.trim()
            : null;
          const normalizedParentCaseId =
            nextParentCaseId === currentCase.id ? null : nextParentCaseId;
          const nextReferenceCaseIds = hasReferencePatch
            ? Array.from(
              new Set(
                (patch.referenceCaseIds ?? [])
                  .map((value: string): string => value.trim())
                  .filter(
                    (value: string): boolean =>
                      value.length > 0 && value !== currentCase.id,
                  ),
              ),
            )
            : currentCase.referenceCaseIds;

          const nextTagId = hasTagPatch
            ? patch.tagId?.trim() || null
            : currentCase.tagId;
          const nextCaseIdentifierId = hasCaseIdentifierPatch
            ? patch.caseIdentifierId?.trim() || null
            : currentCase.caseIdentifierId;
          const nextCategoryId = hasCategoryPatch
            ? patch.categoryId?.trim() || null
            : currentCase.categoryId;
          const nextCaseStatus = hasCaseStatusPatch
            ? patch.caseStatus
            : currentCase.caseStatus;

          const now = new Date().toISOString();
          const nextCase: CaseResolverFile = {
            ...currentCase,
            name: nextName,
            parentCaseId: normalizedParentCaseId,
            referenceCaseIds: nextReferenceCaseIds,
            tagId: nextTagId,
            caseIdentifierId: nextCaseIdentifierId,
            categoryId: nextCategoryId,
            caseStatus: nextCaseStatus,
            updatedAt: now,
          };

          return {
            ...current,
            files: current.files.map((file) =>
              file.id === activeCaseFile.id ? nextCase : file,
            ),
            updatedAt: now,
          };
        },
        { persistToast: 'Case metadata updated.' },
      );
    },
    [activeCaseFile, updateWorkspace],
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
      setWorkspaceView('document');
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
    setWorkspaceView,
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

  const handleRelationGraphChange = useCallback(
    (nextGraph: CaseResolverRelationGraph): void => {
      updateWorkspace(
        (current) => {
          if (stableStringify(current.relationGraph) === stableStringify(nextGraph)) {
            return current;
          }
          return {
            ...current,
            relationGraph: nextGraph,
          };
        },
        {
          persistNow: true,
          source: 'case_view_relation_graph_change',
        }
      );
    },
    [updateWorkspace]
  );

  const handleScanDraftDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsScanDraftDropActive(true);
  }, []);

  const handleScanDraftDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsScanDraftDropActive(true);
  }, []);

  const handleScanDraftDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsScanDraftDropActive(false);
  }, []);

  const handleScanDraftDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsScanDraftDropActive(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        uploadScanDraftFiles(files);
      }
    },
    [uploadScanDraftFiles]
  );

  const handleScanDraftUploadInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) {
        uploadScanDraftFiles(files);
      }
      event.target.value = '';
    },
    [uploadScanDraftFiles]
  );

  const handleDeleteScanDraftSlot = useCallback(
    (slotId: string): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (editingDocumentDraft.isLocked) return;
      const nextSlots = (editingDocumentDraft.scanSlots ?? []).filter((s) => s.id !== slotId);
      updateEditingDocumentDraft({ scanSlots: nextSlots });
    },
    [editingDocumentDraft, updateEditingDocumentDraft]
  );

  const handleRunScanDraftOcr = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    if (editingDocumentDraft.isLocked) return;
    void handleRunScanFileOcr(editingDocumentDraft.id).catch((_error: unknown) => {
      toast(
        _error instanceof Error ? _error.message : 'Failed to run OCR.',
        { variant: 'error' }
      );
    });
  }, [editingDocumentDraft, handleRunScanFileOcr, toast]);

  const handleUseHistoryEntry = useCallback(
    (entry: CaseResolverDocumentHistoryEntry): void => {
      if (!editingDocumentDraft || editingDocumentDraft.isLocked) return;
      const now = new Date().toISOString();
      const currentSnapshot = createCaseResolverHistorySnapshotEntry({
        savedAt: now,
        documentContentVersion: editingDocumentDraft.documentContentVersion,
        activeDocumentVersion: editingDocumentDraft.activeDocumentVersion,
        editorType: editingDocumentDraft.editorType,
        documentContent: editingDocumentDraft.documentContent,
        documentContentMarkdown: editingDocumentDraft.documentContentMarkdown,
        documentContentHtml: editingDocumentDraft.documentContentHtml,
        documentContentPlainText: editingDocumentDraft.documentContentPlainText,
      });
      const nextHistory = [currentSnapshot, ...(editingDocumentDraft.documentHistory ?? [])]
        .filter((e): e is CaseResolverDocumentHistoryEntry => e !== null)
        .slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
      updateEditingDocumentDraft({
        activeDocumentVersion: entry.activeDocumentVersion,
        editorType: entry.editorType,
        documentContent: entry.documentContent,
        documentContentMarkdown: entry.documentContentMarkdown,
        documentContentHtml: entry.documentContentHtml,
        documentContentPlainText: entry.documentContentPlainText,
        documentHistory: nextHistory,
      });
      setEditorContentRevisionSeed((v) => v + 1);
      toast('History entry loaded.', { variant: 'info' });
    },
    [editingDocumentDraft, updateEditingDocumentDraft, toast]
  );

  const handleUpdateDraftDocumentContent = useCallback(
    (next: string): void => {
      if (!editingDocumentDraft || editingDocumentDraft.isLocked) return;
      updateEditingDocumentDraft({ documentContent: next });
    },
    [editingDocumentDraft, updateEditingDocumentDraft]
  );

  const applyDraftCanonicalContent = useCallback(
    (input: {
      value: string;
      markdown?: string | undefined;
      html?: string | undefined;
      warnings?: string[] | undefined;
    }): void => {
      setEditingDocumentDraft((current) => {
        if (!current) return current;
        if (current.isLocked) return current;
        const resolvedMode: 'markdown' | 'wysiwyg' =
          current.fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
        const canonical: DocumentContentCanonical = deriveDocumentContentSync({
          mode: resolvedMode,
          value: resolvedMode === 'markdown'
            ? (input.markdown ?? input.value)
            : input.value,
          previousMarkdown: input.markdown ?? current.documentContentMarkdown,
          previousHtml: input.html ?? current.documentContentHtml,
        });
        const mergedWarnings = input.warnings
          ? Array.from(new Set([...canonical.warnings, ...input.warnings]))
          : canonical.warnings;
        const nextStoredContent = toStorageDocumentValue(canonical);
        const hasMeaningfulDraftChange =
          current.editorType !== canonical.mode ||
          current.documentContentFormatVersion !== 1 ||
          current.documentContent !== nextStoredContent ||
          current.documentContentMarkdown !== canonical.markdown ||
          current.documentContentHtml !== canonical.html ||
          current.documentContentPlainText !== canonical.plainText ||
          JSON.stringify(current.documentConversionWarnings) !== JSON.stringify(mergedWarnings);
        if (!hasMeaningfulDraftChange) {
          return current;
        }
        const now = new Date().toISOString();
        return {
          ...current,
          editorType: canonical.mode,
          documentContentFormatVersion: 1,
          documentContent: nextStoredContent,
          documentContentMarkdown: canonical.markdown,
          documentContentHtml: canonical.html,
          documentContentPlainText: canonical.plainText,
          documentConversionWarnings: mergedWarnings,
          lastContentConversionAt: now,
        };
      });
    },
    [setEditingDocumentDraft]
  );

  const handleSaveFileEditorWrapped = useCallback((): void => {
    if (!editingDocumentDraft || editingDocumentDraft.isLocked) return;
    updateWorkspace((current: CaseResolverWorkspace) => {
      const fileIndex = current.files.findIndex((f) => f.id === editingDocumentDraft.id);
      if (fileIndex < 0) return current;
      const file = current.files[fileIndex];
      if (!file || file.isLocked) return current;
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content: _content, ...draftWithoutContent } = editingDocumentDraft;
      const nextFile = {
        ...file,
        ...draftWithoutContent,
        updatedAt: now,
      } as unknown as CaseResolverFile;
      return {
        ...current,
        files: current.files.map((f, index) =>
          index === fileIndex ? nextFile : f
        ),
        updatedAt: now,
      };
    });
    setEditingDocumentDraft(null);
    toast('Document saved.', { variant: 'success' });
  }, [editingDocumentDraft, updateWorkspace, setEditingDocumentDraft, toast]);

  return {
    state,
    ...state,
    workspaceView,
    setWorkspaceView,
    captureApplyDiagnostics,
    editorDetailsTab,
    setEditorDetailsTab,
    isEditorDraftDirty,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
    partyOptions,
    promptExploderProposalDraft,
    captureProposalTargetFileName,
    editorWidth,
    setEditorWidth,
    isDraggingSplitter,
    setIsDraggingSplitter,
    editorContentRevisionSeed,
    editorSplitRef,
    editorTextareaRef,
    scanDraftUploadInputRef,
    isScanDraftDropActive,
    handleClosePromptExploderProposalModal,
    handleApplyPromptExploderProposal,
    updatePromptExploderProposalAction,
    updatePromptExploderProposalReference,
    updatePromptExploderProposalDateAction,
    resolvePromptExploderMatchedPartyLabel,
    editingDocumentNodeMeta,
    updateEditingDocumentNodeMeta,
    updateEditingDocumentDraft,
    handleOpenPromptExploderForDraft,
    handleCopyDraftFileId,
    handlePreviewDraftPdf,
    handlePrintDraftDocument,
    handleExportDraftPdf,
    handleTriggerScanDraftUpload,
    handleMoveFolder,
    handleToggleFolderLock,
    handleToggleFileLock,
    handleDeleteFile,
    handleDeleteAsset,
    handleGraphChange,
    handleRelationGraphChange,
    handleScanDraftDragEnter,
    handleScanDraftDragOver,
    handleScanDraftDragLeave,
    handleScanDraftDrop,
    handleScanDraftUploadInputChange,
    handleDeleteScanDraftSlot,
    handleRunScanDraftOcr,
    handleUseHistoryEntry,
    handleUpdateDraftDocumentContent,
    preserveWorkspaceView,
    createUniqueNodeFileAssetName,
    buildNodeFileSnapshotText,
    applyDraftCanonicalContent,
    printDocumentMarkup,
    uploadScanDraftFiles,
    handleUpdateActiveFileParties: state.handleUpdateActiveFileParties,
    handleLinkRelatedFiles: state.handleLinkRelatedFiles,
    handleUnlinkRelatedFile: state.handleUnlinkRelatedFile,
    handleSaveFileEditor: handleSaveFileEditorWrapped,
    handleDiscardFileEditorDraft,
    handleDeactivateActiveFile,
    handleCreateDocumentFromSearch,
    handleOpenFileFromSearch,
    handleEditFileFromSearch,
    handleUpdateActiveCaseMetadata,
    activeCaseFile,
  };
}
