'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import { upsertFilemakerCaptureCandidate } from '@/features/case-resolver-capture/filemaker-upsert';
import type {
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  type CaseResolverCaptureAction,
} from '@/features/case-resolver-capture/settings';
import {
  deriveDocumentContentSync,
  toStorageDocumentValue,
} from '@/features/document-editor';
import {
  FILEMAKER_DATABASE_KEY,
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  normalizeFilemakerDatabase,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import { savePromptExploderDraftPromptFromCaseResolver } from '@/features/prompt-exploder/bridge';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';

import { buildPathLabelMap } from './admin-case-resolver-page-helpers';
import { CaseResolverPageView } from '../components/CaseResolverPageView';
import { CaseResolverWorkspaceDebugPanel } from '../components/CaseResolverWorkspaceDebugPanel';
import { useCaseResolverState } from '../hooks/useCaseResolverState';
import {
  createCaseResolverAssetFile,
  normalizeFolderPath,
  normalizeFolderPaths,
} from '../settings';
import {
  buildDocumentPdfMarkup,
  createId,
  isPathWithinFolder,
} from '../utils/caseResolverUtils';

import type {
  CaseResolverAssetFile,
  CaseResolverCategory,
  CaseResolverDocumentHistoryEntry,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
} from '../types';

export function AdminCaseResolverPage(): React.JSX.Element {
  const state = useCaseResolverState();
  const router = useRouter();
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const workspaceDebugEnabled = process.env['NODE_ENV'] !== 'production';
  const [workspaceView, setWorkspaceView] = React.useState<'document' | 'relations'>('document');
  const {
    workspace,
    selectedFileId,
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
    editingDocumentDraft,
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
    confirmAction,
  } = state;

  const openEditorFromQueryHandledRef = React.useRef<string | null>(null);
  React.useEffect(() => {
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

  const [editorWidth, setEditorWidth] = React.useState<number | null>(null);
  const [editorDetailsTab, setEditorDetailsTab] = React.useState<'document' | 'metadata' | 'history'>('document');
  const [isDraggingSplitter, setIsDraggingSplitter] = React.useState(false);
  const [editorContentRevisionSeed, setEditorContentRevisionSeed] = React.useState(0);
  const editorSplitRef = React.useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scanDraftUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isScanDraftDropActive, setIsScanDraftDropActive] = React.useState(false);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = React.useState(false);
  const [documentPreviewHtml, setDocumentPreviewHtml] = React.useState('');
  const initialDraftFingerprintRef = React.useRef<string | null>(null);

  const preserveWorkspaceView = useCallback(
    (view: 'document' | 'relations'): void => {
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
          connectedEdges.flatMap((edge): string[] => [edge.from, edge.to])
        )
      )
        .filter((nodeId: string): boolean => nodeId !== input.nodeId)
        .sort((left, right) => left.localeCompare(right));

      return JSON.stringify(
        {
          kind: 'case_resolver_node_file_snapshot_v1',
          activeCanvasFileId: input.activeCanvasFileId,
          sourceFileId: input.sourceFileId,
          sourceFileName: input.sourceFileName,
          sourceFolder: input.sourceFolder,
          nodeId: input.nodeId,
          node: targetNode,
          nodeMeta: input.graph.nodeMeta?.[input.nodeId] ?? null,
          connectedEdges,
          relatedNodeIds,
        },
        null,
        2
      );
    },
    []
  );

  const buildDraftFingerprint = useCallback((input: typeof editingDocumentDraft): string => {
    if (!input) return '';
    const resolvedMode = input.editorType === 'wysiwyg' ? 'wysiwyg' : 'markdown';
    const canonical = deriveDocumentContentSync({
      mode: resolvedMode,
      value: resolvedMode === 'wysiwyg'
        ? input.documentContentHtml
        : input.documentContentMarkdown,
      previousMarkdown: input.documentContentMarkdown,
      previousHtml: input.documentContentHtml,
    });
    return stableStringify({
      id: input.id,
      name: input.name,
      activeDocumentVersion: input.activeDocumentVersion,
      editorType: canonical.mode,
      documentContent: toStorageDocumentValue(canonical),
      documentContentMarkdown: canonical.markdown,
      documentContentHtml: canonical.html,
      documentDate: input.documentDate ?? null,
      addresser: input.addresser ?? null,
      addressee: input.addressee ?? null,
      referenceCaseIds: [...input.referenceCaseIds].sort(),
      parentCaseId: input.parentCaseId ?? null,
      tagId: input.tagId ?? null,
      caseIdentifierId: input.caseIdentifierId ?? null,
      categoryId: input.categoryId ?? null,
    });
  }, []);

  React.useEffect(() => {
    if (!editingDocumentDraft) {
      initialDraftFingerprintRef.current = null;
      return;
    }
    initialDraftFingerprintRef.current = buildDraftFingerprint(editingDocumentDraft);
    setEditorWidth(null);
    setEditorDetailsTab('document');
    setEditorContentRevisionSeed((value) => value + 1);
  }, [buildDraftFingerprint, editingDocumentDraft?.id]);

  const isEditorDraftDirty = React.useMemo(() => {
    if (!editingDocumentDraft) return false;
    if (!initialDraftFingerprintRef.current) return false;
    return buildDraftFingerprint(editingDocumentDraft) !== initialDraftFingerprintRef.current;
  }, [buildDraftFingerprint, editingDocumentDraft]);

  const caseTagPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverTags),
    [caseResolverTags]
  );
  const caseIdentifierPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers),
    [caseResolverIdentifiers]
  );
  const caseCategoryPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverCategories),
    [caseResolverCategories]
  );
  const caseTagOptions = React.useMemo(
    () => [
      { value: '__none__', label: caseResolverTags.length > 0 ? 'No tag' : 'No tags' },
      ...caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) ?? tag.name,
      })),
    ],
    [caseResolverTags, caseTagPathById]
  );
  const caseIdentifierOptions = React.useMemo(
    () => [
      {
        value: '__none__',
        label: caseResolverIdentifiers.length > 0 ? 'No case identifier' : 'No case identifiers',
      },
      ...caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) ?? identifier.name,
      })),
    ],
    [caseIdentifierPathById, caseResolverIdentifiers]
  );
  const caseCategoryOptions = React.useMemo(
    () => [
      { value: '__none__', label: caseResolverCategories.length > 0 ? 'No category' : 'No categories' },
      ...caseResolverCategories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) ?? category.name,
      })),
    ],
    [caseCategoryPathById, caseResolverCategories]
  );
  const caseReferenceOptions = React.useMemo(
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
  const parentCaseOptions = React.useMemo(
    () => [{ value: '__none__', label: 'No parent (root case)' }, ...caseReferenceOptions],
    [caseReferenceOptions]
  );
  const partyOptions = React.useMemo(
    () => buildFilemakerPartyOptions(filemakerDatabase),
    [filemakerDatabase]
  );
  const [promptExploderProposalDraft, setPromptExploderProposalDraft] =
    React.useState<CaseResolverCaptureProposalState | null>(null);
  const captureProposalTargetFileName = React.useMemo(() => {
    if (!promptExploderProposalDraft) return null;
    const targetFile = workspace.files.find(
      (file) => file.id === promptExploderProposalDraft.targetFileId
    );
    return targetFile?.name ?? promptExploderProposalDraft.targetFileId;
  }, [promptExploderProposalDraft, workspace.files]);

  React.useEffect(() => {
    if (!isPromptExploderPartyProposalOpen || !promptExploderPartyProposal) {
      setPromptExploderProposalDraft(null);
      return;
    }
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
    });
  }, [isPromptExploderPartyProposalOpen, promptExploderPartyProposal]);

  const handleClosePromptExploderProposalModal = useCallback((): void => {
    if (isApplyingPromptExploderPartyProposal) return;
    setIsPromptExploderPartyProposalOpen(false);
  }, [isApplyingPromptExploderPartyProposal, setIsPromptExploderPartyProposalOpen]);

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

  const handleApplyPromptExploderProposal = useCallback((): void => {
    if (!promptExploderProposalDraft) {
      setIsPromptExploderPartyProposalOpen(false);
      return;
    }

    void (async (): Promise<void> => {
      setIsApplyingPromptExploderPartyProposal(true);
      try {
        const targetFileId = promptExploderProposalDraft.targetFileId;
        let nextDatabase = filemakerDatabase;
        let shouldPersistFilemakerDatabase = false;
        let nextProposalState: CaseResolverCaptureProposalState = {
          targetFileId: promptExploderProposalDraft.targetFileId,
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
        };

        const rolePatches: {
          addresser?: { kind: 'person' | 'organization'; id: string } | null;
          addressee?: { kind: 'person' | 'organization'; id: string } | null;
        } = {};
        const failedRoles: string[] = [];
        const appliedRoles: string[] = [];

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
            appliedRoles.push(roleLabel);
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
          appliedRoles.push(roleLabel);
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
          } catch (error) {
            toast(
              error instanceof Error
                ? error.message
                : 'Failed to save Filemaker records for capture mapping.',
              { variant: 'error' }
            );
            return;
          }
        }

        const shouldPatchAddresser = rolePatches.addresser !== undefined;
        const shouldPatchAddressee = rolePatches.addressee !== undefined;
        const shouldPersistPatch = shouldPatchAddresser || shouldPatchAddressee;

        if (shouldPersistPatch) {
          const now = new Date().toISOString();
          updateWorkspace((current) => ({
            ...current,
            files: current.files.map((file) => {
              if (file.id !== targetFileId) return file;
              return {
                ...file,
                ...(shouldPatchAddresser ? { addresser: rolePatches.addresser ?? null } : {}),
                ...(shouldPatchAddressee ? { addressee: rolePatches.addressee ?? null } : {}),
                updatedAt: now,
              };
            }),
          }), { persistToast: 'Capture mapping applied.' });
          setEditingDocumentDraft((current) => {
            if (current?.id !== targetFileId) return current;
            return {
              ...current,
              ...(shouldPatchAddresser ? { addresser: rolePatches.addresser ?? null } : {}),
              ...(shouldPatchAddressee ? { addressee: rolePatches.addressee ?? null } : {}),
            };
          });
        }

        setPromptExploderPartyProposal(nextProposalState);
        setPromptExploderProposalDraft(nextProposalState);

        if (failedRoles.length > 0) {
          toast(
            `Capture mapping partially applied. Could not apply: ${failedRoles.join(', ')}.`,
            { variant: 'warning' }
          );
          return;
        }

        setIsPromptExploderPartyProposalOpen(false);
        if (appliedRoles.length > 0) {
          toast('Capture mapping applied to document parties.', { variant: 'success' });
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
      }
    })();
  }, [
    filemakerDatabase,
    promptExploderProposalDraft,
    setEditingDocumentDraft,
    setIsApplyingPromptExploderPartyProposal,
    setIsPromptExploderPartyProposalOpen,
    setPromptExploderProposalDraft,
    setPromptExploderPartyProposal,
    toast,
    updateSetting,
    updateWorkspace,
  ]);

  const resolvePromptExploderMatchedPartyLabel = useCallback(
    (reference: { kind: string; id: string } | null | undefined): string => {
      if (!reference) return 'None';
      return (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        resolveFilemakerPartyLabel(filemakerDatabase, { ...reference, kind: reference.kind as any }) ??
        `${reference.kind}:${reference.id}`
      );
    },
    [filemakerDatabase]
  );

  const updateEditingDocumentDraft = useCallback(
    (patch: Partial<CaseResolverFileEditDraft>): void => {
      setEditingDocumentDraft((current) => (current ? { ...current, ...patch } : current));
    },
    [setEditingDocumentDraft]
  );

  const handleOpenPromptExploderForDraft = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const promptSource = (
      editingDocumentDraft.documentContentMarkdown ||
      editingDocumentDraft.documentContent
    ).trim();
    if (!promptSource) {
      toast('Add document content before opening Prompt Exploder.', { variant: 'warning' });
      return;
    }

    savePromptExploderDraftPromptFromCaseResolver(promptSource, {
      fileId: editingDocumentDraft.id,
      fileName: editingDocumentDraft.name.trim() || editingDocumentDraft.id,
    });
    const returnTo = `/admin/case-resolver?openEditor=1&fileId=${encodeURIComponent(
      editingDocumentDraft.id
    )}`;
    router.push(`/admin/prompt-exploder?returnTo=${encodeURIComponent(returnTo)}`);
  }, [editingDocumentDraft, router, toast]);

  const handleCopyDraftFileId = useCallback(async (): Promise<void> => {
    if (!editingDocumentDraft) return;
    try {
      await navigator.clipboard.writeText(editingDocumentDraft.id);
      toast('File ID copied to clipboard.', { variant: 'success' });
    } catch {
      toast('Failed to copy file ID.', { variant: 'error' });
    }
  }, [editingDocumentDraft, toast]);

  const buildDraftPdfPreviewMarkup = useCallback((draft: CaseResolverFileEditDraft): string => {
    const resolvedMode = draft.editorType === 'wysiwyg' ? 'wysiwyg' : 'markdown';
    const canonical = deriveDocumentContentSync({
      mode: resolvedMode,
      value: resolvedMode === 'wysiwyg'
        ? draft.documentContentHtml
        : draft.documentContentMarkdown,
      previousMarkdown: draft.documentContentMarkdown,
      previousHtml: draft.documentContentHtml,
    });
    const addresserLabel = draft.addresser
      ? resolveFilemakerPartyLabel(filemakerDatabase, draft.addresser) ?? 'Not selected'
      : 'Not selected';
    const addresseeLabel = draft.addressee
      ? resolveFilemakerPartyLabel(filemakerDatabase, draft.addressee) ?? 'Not selected'
      : 'Not selected';
    return buildDocumentPdfMarkup({
      documentDate: draft.documentDate,
      documentHash: draft.id,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      addresserLabel,
      addresseeLabel,
      documentContent: canonical.html,
    });
  }, [filemakerDatabase]);

  const printDocumentMarkup = useCallback((markup: string): void => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';

    const cleanup = (): void => {
      window.setTimeout((): void => {
        if (frame.parentNode) {
          frame.parentNode.removeChild(frame);
        }
      }, 300);
    };

    frame.onload = (): void => {
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
        } catch {
          toast('Failed to open the print dialog.', { variant: 'error' });
        }
        cleanup();
      }, 120);
    };

    document.body.appendChild(frame);
    frame.srcdoc = markup;
  }, [toast]);

  const handlePreviewDraftPdf = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft);
    setDocumentPreviewHtml(markup);
    setIsDocumentPreviewOpen(true);
  }, [buildDraftPdfPreviewMarkup, editingDocumentDraft]);

  const handlePrintDraftDocument = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const markup = buildDraftPdfPreviewMarkup(editingDocumentDraft);
    printDocumentMarkup(markup);
  }, [buildDraftPdfPreviewMarkup, editingDocumentDraft, printDocumentMarkup]);

  const handleCloseDocumentPreview = useCallback((): void => {
    setIsDocumentPreviewOpen(false);
  }, []);

  const handlePrintDocumentPreview = useCallback((): void => {
    if (!documentPreviewHtml.trim()) {
      toast('No preview content to print.', { variant: 'warning' });
      return;
    }
    printDocumentMarkup(documentPreviewHtml);
  }, [documentPreviewHtml, printDocumentMarkup, toast]);

  React.useEffect(() => {
    if (editingDocumentDraft) return;
    setIsDocumentPreviewOpen(false);
    setDocumentPreviewHtml('');
  }, [editingDocumentDraft]);

  const handleTriggerScanDraftUpload = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    if (isUploadingScanDraftFiles) return;
    scanDraftUploadInputRef.current?.click();
  }, [editingDocumentDraft, isUploadingScanDraftFiles]);

  const uploadScanDraftFiles = useCallback(
    (files: File[]): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (files.length === 0) return;
      void handleUploadScanFiles(editingDocumentDraft.id, files).catch((error: unknown) => {
        toast(
          error instanceof Error ? error.message : 'Failed to upload scan images.',
          { variant: 'error' }
        );
      });
    },
    [editingDocumentDraft, handleUploadScanFiles, toast]
  );

  const handleScanDraftUploadInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      uploadScanDraftFiles(files);
    },
    [uploadScanDraftFiles]
  );

  const handleDeleteScanDraftSlot = useCallback(
    (slotId: string): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (isUploadingScanDraftFiles) return;
      const fileId = editingDocumentDraft.id;
      const targetSlot = editingDocumentDraft.scanSlots.find((slot) => slot.id === slotId);
      if (!targetSlot) return;

      updateWorkspace(
        (current) => {
          const now = new Date().toISOString();
          let changed = false;
          const nextFiles = current.files.map((file) => {
            if (file.id !== fileId || file.fileType !== 'scanfile') return file;
            const nextSlots = file.scanSlots.filter((slot) => slot.id !== slotId);
            if (nextSlots.length === file.scanSlots.length) return file;
            changed = true;
            return {
              ...file,
              scanSlots: nextSlots,
              updatedAt: now,
            };
          });
          if (!changed) return current;
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: 'Document slot removed.' }
      );
      setEditingDocumentDraft((current) => {
        if (current?.id !== fileId || current.fileType !== 'scanfile') return current;
        const nextSlots = current.scanSlots.filter((slot) => slot.id !== slotId);
        if (nextSlots.length === current.scanSlots.length) return current;
        return {
          ...current,
          scanSlots: nextSlots,
          updatedAt: new Date().toISOString(),
        };
      });
      toast(`Removed "${targetSlot.name || 'file'}" from document slots.`, {
        variant: 'success',
      });
    },
    [editingDocumentDraft, isUploadingScanDraftFiles, setEditingDocumentDraft, toast, updateWorkspace]
  );

  const handleRunScanDraftOcr = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    void handleRunScanFileOcr(editingDocumentDraft.id).catch((error: unknown) => {
      toast(
        error instanceof Error ? error.message : 'Failed to run OCR.',
        { variant: 'error' }
      );
    });
  }, [editingDocumentDraft, handleRunScanFileOcr, toast]);

  const handleScanDraftDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsScanDraftDropActive(false);
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (isUploadingScanDraftFiles) return;
      const files = Array.from(event.dataTransfer.files ?? []);
      uploadScanDraftFiles(files);
    },
    [editingDocumentDraft, isUploadingScanDraftFiles, uploadScanDraftFiles]
  );

  const handleScanDraftDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      const hasFiles = Array.from(event.dataTransfer.types ?? []).includes('Files');
      if (!hasFiles) return;
      event.preventDefault();
      setIsScanDraftDropActive(true);
    },
    [editingDocumentDraft]
  );

  const handleScanDraftDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      const hasFiles = Array.from(event.dataTransfer.types ?? []).includes('Files');
      if (!hasFiles) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsScanDraftDropActive(true);
    },
    [editingDocumentDraft]
  );

  const handleScanDraftDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    setIsScanDraftDropActive(false);
  }, []);

  const applyDraftCanonicalContent = useCallback(
    (input: {
      mode: 'markdown' | 'wysiwyg' | 'code';
      value: string;
      markdown?: string | undefined;
      html?: string | undefined;
      warnings?: string[] | undefined;
    }): void => {
      setEditingDocumentDraft((current) => {
        if (!current) return current;
        const canonical = deriveDocumentContentSync({
          mode: input.mode,
          value: input.value,
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

  const handleUpdateDraftDocumentContent = useCallback((next: string) => {
    if (!editingDocumentDraft) return;
    if (editingDocumentDraft.editorType === 'wysiwyg') {
      applyDraftCanonicalContent({
        mode: 'wysiwyg',
        value: next,
        html: next,
        markdown: editingDocumentDraft.documentContentMarkdown,
      });
      return;
    }
    applyDraftCanonicalContent({
      mode: editingDocumentDraft.editorType,
      value: next,
      markdown: next,
      html: editingDocumentDraft.documentContentHtml,
    });
  }, [applyDraftCanonicalContent, editingDocumentDraft]);

  const handleUseHistoryEntry = useCallback((entry: CaseResolverDocumentHistoryEntry): void => {
    if (!editingDocumentDraft) return;
    const nextMode = entry.editorType;
    applyDraftCanonicalContent({
      mode: nextMode,
      value: nextMode === 'wysiwyg' ? entry.documentContentHtml : entry.documentContentMarkdown,
      html: entry.documentContentHtml,
      markdown: entry.documentContentMarkdown,
    });
    updateEditingDocumentDraft({
      activeDocumentVersion: entry.activeDocumentVersion,
    });
    setEditorDetailsTab('document');
    toast('Revision loaded into the editor. Save to apply it.', { variant: 'info' });
  }, [
    applyDraftCanonicalContent,
    editingDocumentDraft,
    toast,
    updateEditingDocumentDraft,
  ]);

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
      updateWorkspace(
        (current) => {
          const folderFiles = current.files.filter((file) =>
            isPathWithinFolder(file.folder, normalizedFolderPath)
          );
          if (folderFiles.length === 0) return current;

          const shouldLock = folderFiles.some((file) => !file.isLocked);
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
    },
    [updateWorkspace]
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
    },
    [updateWorkspace]
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
            const nextFiles = current.files.filter((file) => file.id !== fileId);
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

  const handleGraphChange = useCallback(
    (nextGraph: CaseResolverGraph): void => {
      updateWorkspace((current) => {
        if (!current.activeFileId) return current;
        const activeFile = current.files.find((file) => file.id === current.activeFileId);
        if (!activeFile) return current;

        const activeGraph = activeFile.graph;
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
          const normalizedFolder = normalizeFolderPath(sourceFile?.folder ?? activeFile.folder ?? '');
          const baseName =
            `${(sourceFile?.name ?? 'Document').trim() || 'Document'} Node File`;
          const name = createUniqueNodeFileAssetName(nextAssets, normalizedFolder, baseName);
          const createdAssetId = createId('asset');
          const snapshot = buildNodeFileSnapshotText({
            graph: nextGraph,
            nodeId,
            sourceFileId,
            sourceFileName: sourceFile?.name ?? null,
            sourceFolder: sourceFile?.folder ?? null,
            activeCanvasFileId: activeFile.id,
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
          if (!nextNodeIds.has(nodeId)) {
            delete nextNodeFileMap[nodeId];
            return;
          }
          const assetIndex = nextAssets.findIndex(
            (asset: CaseResolverAssetFile): boolean =>
              asset.id === assetId && asset.kind === 'node_file'
          );
          if (assetIndex < 0) {
            delete nextNodeFileMap[nodeId];
            return;
          }

          const currentAsset = nextAssets[assetIndex];
          if (!currentAsset) {
            delete nextNodeFileMap[nodeId];
            return;
          }
          const mappedSourceFileId =
            typeof nextSourceFileIdByNode[nodeId] === 'string' &&
            nextSourceFileIdByNode[nodeId].trim().length > 0
              ? nextSourceFileIdByNode[nodeId].trim()
              : currentAsset.sourceFileId;
          const sourceFile = mappedSourceFileId
            ? filesById.get(mappedSourceFileId) ?? null
            : null;
          const snapshot = buildNodeFileSnapshotText({
            graph: nextGraph,
            nodeId,
            sourceFileId: mappedSourceFileId ?? null,
            sourceFileName: sourceFile?.name ?? null,
            sourceFolder: sourceFile?.folder ?? null,
            activeCanvasFileId: activeFile.id,
          });
          const shouldUpdateAsset =
            currentAsset.textContent !== snapshot ||
            (mappedSourceFileId ?? null) !== currentAsset.sourceFileId;
          if (!shouldUpdateAsset) return;
          const updatedAsset: CaseResolverAssetFile = {
            ...currentAsset,
            sourceFileId: mappedSourceFileId ?? null,
            textContent: snapshot,
            updatedAt: now,
          };
          nextAssets = [
            ...nextAssets.slice(0, assetIndex),
            updatedAsset,
            ...nextAssets.slice(assetIndex + 1),
          ];
          assetsChanged = true;
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
            if (file.id !== activeFile.id) return file;
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

  const handleRelationGraphChange = useCallback(
    (nextGraph: CaseResolverRelationGraph): void => {
      updateWorkspace((current) => {
        if (stableStringify(current.relationGraph) === stableStringify(nextGraph)) {
          return current;
        }
        return {
          ...current,
          relationGraph: nextGraph,
        };
      });
    },
    [updateWorkspace]
  );

  return (
    <>
      <CaseResolverPageView
        state={state}
        workspaceView={workspaceView}
        setWorkspaceView={setWorkspaceView}
        handleMoveFolder={handleMoveFolder}
        handleToggleFolderLock={handleToggleFolderLock}
        handleToggleFileLock={handleToggleFileLock}
        handleDeleteFile={handleDeleteFile}
        handleGraphChange={handleGraphChange}
        handleRelationGraphChange={handleRelationGraphChange}
        editorDetailsTab={editorDetailsTab}
        setEditorDetailsTab={setEditorDetailsTab}
        isScanDraftDropActive={isScanDraftDropActive}
        scanDraftUploadInputRef={scanDraftUploadInputRef}
        handleScanDraftDragEnter={handleScanDraftDragEnter}
        handleScanDraftDragOver={handleScanDraftDragOver}
        handleScanDraftDragLeave={handleScanDraftDragLeave}
        handleScanDraftDrop={handleScanDraftDrop}
        handleScanDraftUploadInputChange={handleScanDraftUploadInputChange}
        handleTriggerScanDraftUpload={handleTriggerScanDraftUpload}
        handleDeleteScanDraftSlot={handleDeleteScanDraftSlot}
        handleRunScanDraftOcr={handleRunScanDraftOcr}
        updateEditingDocumentDraft={updateEditingDocumentDraft}
        caseTagOptions={caseTagOptions}
        caseIdentifierOptions={caseIdentifierOptions}
        caseCategoryOptions={caseCategoryOptions}
        caseReferenceOptions={caseReferenceOptions}
        parentCaseOptions={parentCaseOptions}
        partyOptions={partyOptions}
        handleUseHistoryEntry={handleUseHistoryEntry}
        isEditorDraftDirty={isEditorDraftDirty}
        handleOpenPromptExploderForDraft={handleOpenPromptExploderForDraft}
        editorContentRevisionSeed={editorContentRevisionSeed}
        handleUpdateDraftDocumentContent={handleUpdateDraftDocumentContent}
        editorTextareaRef={editorTextareaRef}
        editorSplitRef={editorSplitRef}
        editorWidth={editorWidth}
        setEditorWidth={setEditorWidth}
        isDraggingSplitter={isDraggingSplitter}
        setIsDraggingSplitter={setIsDraggingSplitter}
        handleCopyDraftFileId={handleCopyDraftFileId}
        handlePreviewDraftPdf={handlePreviewDraftPdf}
        handlePrintDraftDocument={handlePrintDraftDocument}
        isDocumentPreviewOpen={isDocumentPreviewOpen}
        documentPreviewHtml={documentPreviewHtml}
        handleCloseDocumentPreview={handleCloseDocumentPreview}
        handlePrintDocumentPreview={handlePrintDocumentPreview}
        promptExploderProposalDraft={promptExploderProposalDraft}
        captureProposalTargetFileName={captureProposalTargetFileName}
        handleClosePromptExploderProposalModal={handleClosePromptExploderProposalModal}
        handleApplyPromptExploderProposal={handleApplyPromptExploderProposal}
        updatePromptExploderProposalAction={updatePromptExploderProposalAction}
        updatePromptExploderProposalReference={updatePromptExploderProposalReference}
        resolvePromptExploderMatchedPartyLabel={resolvePromptExploderMatchedPartyLabel}
      />
      <CaseResolverWorkspaceDebugPanel enabled={workspaceDebugEnabled} />
    </>
  );
}
