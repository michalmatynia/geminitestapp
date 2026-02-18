'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
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
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import { savePromptExploderDraftPromptFromCaseResolver } from '@/features/prompt-exploder/bridge';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';

import { buildPathLabelMap } from './admin-case-resolver-page-helpers';
import { CaseResolverPageView } from '../components/CaseResolverPageView';
import { CaseResolverWorkspaceDebugPanel } from '../components/CaseResolverWorkspaceDebugPanel';
import { useCaseResolverState } from '../hooks/useCaseResolverState';
import {
  DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
  normalizeFolderPath,
} from '../settings';
import { isPathWithinFolder } from '../utils/caseResolverUtils';

import type {
  CaseResolverCategory,
  CaseResolverDocumentHistoryEntry,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
} from '../types';

type ChatbotModelListResponse = {
  models?: string[];
  warning?: {
    code?: string;
    message?: string;
  };
};

const OCR_MODEL_ID_HINTS = [
  'vision',
  'vl',
  'llava',
  'minicpm',
  'moondream',
  'ocr',
  'gpt-4o',
  'gpt-4.1',
  'gpt-5',
  'gemini',
  'claude-3',
  'pixtral',
] as const;

const isLikelyOcrCapableModelId = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return OCR_MODEL_ID_HINTS.some((hint) => normalized.includes(hint));
};

export function AdminCaseResolverPage(): React.JSX.Element {
  const state = useCaseResolverState();
  const router = useRouter();
  const { toast } = useToast();
  const workspaceDebugEnabled = process.env['NODE_ENV'] !== 'production';
  const [workspaceView, setWorkspaceView] = React.useState<'document' | 'relations'>('document');
  const modelsQuery = createListQueryV2<ChatbotModelListResponse, ChatbotModelListResponse>({
    queryKey: QUERY_KEYS.ai.chatbot.models(),
    queryFn: ({ signal }) => api.get<ChatbotModelListResponse>('/api/chatbot', { signal }),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'case-resolver.page.models-query',
      operation: 'list',
      resource: 'ai.chatbot.models',
      domain: 'global',
      tags: ['case-resolver', 'ocr', 'models'],
    },
  });
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
  const initialDraftFingerprintRef = React.useRef<string | null>(null);

  const preserveWorkspaceView = useCallback(
    (view: 'document' | 'relations'): void => {
      window.setTimeout((): void => {
        setWorkspaceView((current) => (current === view ? current : view));
      }, 0);
    },
    []
  );

  const buildDraftFingerprint = useCallback((input: typeof editingDocumentDraft): string => {
    if (!input) return '';
    return JSON.stringify({
      id: input.id,
      name: input.name,
      activeDocumentVersion: input.activeDocumentVersion,
      editorType: input.editorType,
      documentContent: input.documentContent,
      documentContentMarkdown: input.documentContentMarkdown,
      documentContentHtml: input.documentContentHtml,
      documentDate: input.documentDate,
      addresser: input.addresser,
      addressee: input.addressee,
      referenceCaseIds: input.referenceCaseIds,
      tagId: input.tagId,
      caseIdentifierId: input.caseIdentifierId,
      categoryId: input.categoryId,
      scanOcrModel: input.scanOcrModel,
      scanOcrPrompt: input.scanOcrPrompt,
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
  const scanOcrModelOptions = React.useMemo(() => {
    const candidates = Array.from(
      new Set([
        ...(modelsQuery.data?.models ?? []),
        caseResolverSettings.ocrModel,
        editingDocumentDraft?.fileType === 'scanfile' ? editingDocumentDraft.scanOcrModel : '',
      ]
        .map((value: string) => value.trim())
        .filter(Boolean))
    );
    const likelyOcrModels = candidates.filter((value: string) =>
      isLikelyOcrCapableModelId(value)
    );
    const resolvedModels =
      likelyOcrModels.length > 0 ? likelyOcrModels : candidates;
    return resolvedModels.map((model) => ({
      value: model,
      label: model,
    }));
  }, [
    caseResolverSettings.ocrModel,
    editingDocumentDraft?.fileType,
    editingDocumentDraft?.scanOcrModel,
    modelsQuery.data?.models,
  ]);
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

    setIsApplyingPromptExploderPartyProposal(true);
    try {
      const targetFileId = promptExploderProposalDraft.targetFileId;
      const addresserReference =
        promptExploderProposalDraft.addresser?.action === 'database'
          ? promptExploderProposalDraft.addresser.existingReference ?? null
          : undefined;
      const addresseeReference =
        promptExploderProposalDraft.addressee?.action === 'database'
          ? promptExploderProposalDraft.addressee.existingReference ?? null
          : undefined;
      const shouldPatchAddresser = addresserReference !== undefined;
      const shouldPatchAddressee = addresseeReference !== undefined;
      const shouldPersistPatch = shouldPatchAddresser || shouldPatchAddressee;

      if (shouldPersistPatch) {
        const now = new Date().toISOString();
        updateWorkspace((current) => ({
          ...current,
          files: current.files.map((file) => {
            if (file.id !== targetFileId) return file;
            return {
              ...file,
              ...(shouldPatchAddresser ? { addresser: addresserReference } : {}),
              ...(shouldPatchAddressee ? { addressee: addresseeReference } : {}),
              updatedAt: now,
            };
          }),
        }), { persistToast: 'Capture mapping applied.' });
        setEditingDocumentDraft((current) => {
          if (current?.id !== targetFileId) return current;
          return {
            ...current,
            ...(shouldPatchAddresser ? { addresser: addresserReference } : {}),
            ...(shouldPatchAddressee ? { addressee: addresseeReference } : {}),
          };
        });
      }

      setPromptExploderPartyProposal(promptExploderProposalDraft);
      setIsPromptExploderPartyProposalOpen(false);
      toast(
        shouldPersistPatch
          ? 'Capture mapping applied to document parties.'
          : 'No database mapping selected. Document parties were not changed.',
        { variant: shouldPersistPatch ? 'success' : 'info' }
      );
    } finally {
      setIsApplyingPromptExploderPartyProposal(false);
    }
  }, [
    promptExploderProposalDraft,
    setEditingDocumentDraft,
    setIsApplyingPromptExploderPartyProposal,
    setIsPromptExploderPartyProposalOpen,
    setPromptExploderPartyProposal,
    toast,
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

  React.useEffect(() => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    const promptValue = editingDocumentDraft.scanOcrPrompt.trim();
    const currentModelValue = editingDocumentDraft.scanOcrModel.trim();
    const fallbackModel =
      caseResolverSettings.ocrModel.trim() ||
      scanOcrModelOptions[0]?.value?.trim() ||
      '';
    const nextModel = currentModelValue || fallbackModel;
    const needsPromptDefault = promptValue.length === 0;
    const needsModelDefault = currentModelValue.length === 0 && nextModel.length > 0;
    if (!needsPromptDefault && !needsModelDefault) return;
    updateEditingDocumentDraft({
      ...(needsPromptDefault
        ? { scanOcrPrompt: DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT }
        : {}),
      ...(needsModelDefault ? { scanOcrModel: nextModel } : {}),
    });
  }, [
    caseResolverSettings.ocrModel,
    editingDocumentDraft?.fileType,
    editingDocumentDraft?.scanOcrModel,
    editingDocumentDraft?.scanOcrPrompt,
    scanOcrModelOptions,
    updateEditingDocumentDraft,
  ]);

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
    void handleRunScanFileOcr(editingDocumentDraft.id, {
      model: editingDocumentDraft.scanOcrModel,
      prompt: editingDocumentDraft.scanOcrPrompt,
    }).catch((error: unknown) => {
      toast(
        error instanceof Error ? error.message : 'Failed to run OCR.',
        { variant: 'error' }
      );
    });
  }, [editingDocumentDraft, handleRunScanFileOcr, toast]);

  const handleScanDraftOcrModelChange = useCallback((value: string): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    updateEditingDocumentDraft({
      scanOcrModel: value,
    });
  }, [editingDocumentDraft, updateEditingDocumentDraft]);

  const handleScanDraftOcrPromptChange = useCallback((value: string): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    updateEditingDocumentDraft({
      scanOcrPrompt: value,
    });
  }, [editingDocumentDraft, updateEditingDocumentDraft]);

  const handleResetScanDraftOcrPrompt = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    updateEditingDocumentDraft({
      scanOcrPrompt: DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
    });
  }, [editingDocumentDraft, updateEditingDocumentDraft]);

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
        const now = new Date().toISOString();
        let changed = false;
        const nextFiles = current.files.map((file) => {
          if (file.id !== current.activeFileId) return file;
          changed = true;
          return {
            ...file,
            graph: nextGraph,
            updatedAt: now,
          };
        });
        if (!changed) return current;
        return {
          ...current,
          files: nextFiles,
        };
      });
    },
    [updateWorkspace]
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
        scanOcrModelOptions={scanOcrModelOptions}
        handleScanDraftOcrModelChange={handleScanDraftOcrModelChange}
        handleScanDraftOcrPromptChange={handleScanDraftOcrPromptChange}
        handleResetScanDraftOcrPrompt={handleResetScanDraftOcrPrompt}
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
