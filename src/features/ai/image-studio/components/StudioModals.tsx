'use client';

import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import FileManager from '@/features/files/components/FileManager';
import {
  flattenParams,
  inferParamSpecs,
  type ParamSpec,
} from '@/features/prompt-engine/prompt-params';
import { api } from '@/shared/lib/api-client';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { Button, Input, Label, AppModal, Textarea, useToast } from '@/shared/ui';

import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { isParamUiControl, recommendParamUiControl, type ParamUiControl } from '../utils/param-ui';

type UiExtractorSuggestion = {
  path: string;
  control: ParamUiControl;
};

type PromptExtractValidationIssue = {
  ruleId?: string;
  severity?: string;
  title?: string;
  message?: string;
  suggestions?: Array<{
    suggestion?: string;
    found?: string;
    comment?: string | null;
  }>;
};

type PromptExtractApiResponse = {
  params?: Record<string, unknown>;
  source?: 'programmatic' | 'programmatic_autofix' | 'gpt';
  modeRequested?: 'programmatic' | 'gpt' | 'hybrid';
  fallbackUsed?: boolean;
  formattedPrompt?: string | null;
  validation?: {
    before?: PromptExtractValidationIssue[];
    after?: PromptExtractValidationIssue[];
  };
  diagnostics?: {
    programmaticError?: string | null;
    aiError?: string | null;
    model?: string | null;
    autofixApplied?: boolean;
  };
};

type PromptExtractRunKind = 'programmatic' | 'smart' | 'ai';

type PromptExtractHistoryEntry = {
  id: string;
  createdAt: number;
  runKind: PromptExtractRunKind;
  source: 'programmatic' | 'programmatic_autofix' | 'gpt' | null;
  modeRequested: 'programmatic' | 'gpt' | 'hybrid' | null;
  fallbackUsed: boolean;
  autofixApplied: boolean;
  promptBefore: string;
  promptAfter: string;
  validationBeforeCount: number;
  validationAfterCount: number;
};

type PromptDiffLine = {
  before: string | null;
  after: string | null;
  changed: boolean;
};

const getPromptSourceLabel = (
  source: PromptExtractHistoryEntry['source']
): string => {
  if (source === 'programmatic_autofix') return 'Programmatic + Autofix';
  if (source === 'programmatic') return 'Programmatic';
  if (source === 'gpt') return 'AI';
  return 'Unknown';
};

const getPromptRunKindLabel = (runKind: PromptExtractRunKind): string => {
  if (runKind === 'programmatic') return 'Programmatic Extract';
  if (runKind === 'ai') return 'AI Extract';
  return 'Smart Extract';
};

const formatHistoryTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const buildPromptDiffLines = (
  beforePrompt: string,
  afterPrompt: string,
): PromptDiffLine[] => {
  const beforeLines = beforePrompt.split(/\r?\n/);
  const afterLines = afterPrompt.split(/\r?\n/);
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const rows: PromptDiffLine[] = [];
  for (let index = 0; index < maxLines; index += 1) {
    const before = beforeLines[index] ?? null;
    const after = afterLines[index] ?? null;
    rows.push({
      before,
      after,
      changed: before !== after,
    });
  }
  return rows;
};

function toSlotName(filename: string, index: number): string {
  const clean = filename.trim();
  if (!clean) return `Card ${index + 1}`;
  const dotIndex = clean.lastIndexOf('.');
  if (dotIndex <= 0) return clean;
  return clean.slice(0, dotIndex);
}

function buildHeuristicControls(
  params: Record<string, unknown>,
  specs: Record<string, ParamSpec> | null
): Record<string, ParamUiControl> {
  const next: Record<string, ParamUiControl> = {};
  const leaves = flattenParams(params).filter((leaf) => Boolean(leaf.path));
  leaves.forEach((leaf) => {
    const spec = specs?.[leaf.path];
    const recommendation = recommendParamUiControl(leaf.value, spec);
    next[leaf.path] = recommendation.recommended;
  });
  return next;
}

export function StudioModals(): React.JSX.Element {
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const {
    slots,
    selectedFolder,
    selectedSlot,
    slotCreateOpen,
    driveImportOpen,
    driveImportMode,
    driveImportTargetId,
    temporaryObjectUpload,
    slotInlineEditOpen,
    slotImageUrlDraft,
    slotBase64Draft,
    slotUpdateBusy,
  } = useSlotsState();
  const {
    setSelectedSlotId,
    createSlots,
    updateSlotMutation,
    setSlotCreateOpen,
    setDriveImportOpen,
    setDriveImportMode,
    setDriveImportTargetId,
    setTemporaryObjectUpload,
    importFromDriveMutation,
    uploadMutation,
    setSlotInlineEditOpen,
    setSlotImageUrlDraft,
    setSlotBase64Draft,
    setSlotUpdateBusy,
  } = useSlotsActions();
  const { extractReviewOpen, extractDraftPrompt } = usePromptState();
  const {
    setExtractReviewOpen,
    setExtractDraftPrompt,
    setPromptText,
    setParamsState,
    setParamSpecs,
    setParamUiOverrides,
    setExtractPreviewUiOverrides,
  } = usePromptActions();
  const { studioSettings } = useSettingsState();

  const [slotNameDraft, setSlotNameDraft] = useState('');
  const [slotFolderDraft, setSlotFolderDraft] = useState('');

  const [extractBusy, setExtractBusy] = useState<'none' | 'programmatic' | 'smart' | 'ai' | 'ui'>('none');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [previewParams, setPreviewParams] = useState<Record<string, unknown> | null>(null);
  const [previewSpecs, setPreviewSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [previewControls, setPreviewControls] = useState<Record<string, ParamUiControl>>({});
  const [previewValidation, setPreviewValidation] = useState<{
    before: PromptExtractValidationIssue[];
    after: PromptExtractValidationIssue[];
  } | null>(null);
  const [extractHistory, setExtractHistory] = useState<PromptExtractHistoryEntry[]>([]);
  const [selectedExtractHistoryId, setSelectedExtractHistoryId] = useState<string | null>(null);
  const localUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [localUploadMode, setLocalUploadMode] = useState<'create' | 'replace' | 'temporary-object'>('create');
  const [localUploadTargetId, setLocalUploadTargetId] = useState<string | null>(null);

  const previewLeaves = useMemo(
    () => (previewParams ? flattenParams(previewParams).filter((leaf) => Boolean(leaf.path)) : []),
    [previewParams]
  );
  const selectedExtractHistory = useMemo(() => {
    if (extractHistory.length === 0) return null;
    if (!selectedExtractHistoryId) return extractHistory[0] ?? null;
    return (
      extractHistory.find((entry: PromptExtractHistoryEntry) => entry.id === selectedExtractHistoryId) ??
      extractHistory[0] ??
      null
    );
  }, [extractHistory, selectedExtractHistoryId]);
  const selectedExtractDiffLines = useMemo(() => {
    if (!selectedExtractHistory) return [] as PromptDiffLine[];
    return buildPromptDiffLines(
      selectedExtractHistory.promptBefore,
      selectedExtractHistory.promptAfter
    );
  }, [selectedExtractHistory]);
  const selectedExtractChanged = useMemo(
    () =>
      selectedExtractHistory
        ? selectedExtractHistory.promptBefore !== selectedExtractHistory.promptAfter
        : false,
    [selectedExtractHistory]
  );

  useEffect(() => {
    if (!slotInlineEditOpen || !selectedSlot) return;
    setSlotNameDraft(selectedSlot.name ?? '');
    setSlotFolderDraft(selectedSlot.folderPath ?? selectedFolder ?? '');
    setSlotImageUrlDraft(selectedSlot.imageUrl ?? selectedSlot.imageFile?.filepath ?? '');
    setSlotBase64Draft(selectedSlot.imageBase64 ?? '');
  }, [
    slotInlineEditOpen,
    selectedSlot,
    selectedFolder,
    setSlotImageUrlDraft,
    setSlotBase64Draft,
  ]);

  useEffect(() => {
    if (!extractReviewOpen) return;
    setExtractError(null);
    setPreviewParams(null);
    setPreviewSpecs(null);
    setPreviewControls({});
    setPreviewValidation(null);
    setExtractPreviewUiOverrides({});
  }, [extractReviewOpen, setExtractPreviewUiOverrides]);

  const deleteStagedAsset = async (asset: { id: string; filepath: string }): Promise<void> => {
    if (!projectId) return;
    await api.post(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/delete`, {
      id: asset.id,
      filepath: asset.filepath,
    });
  };

  const handleDriveSelection = async (files: ImageFileSelection[]) => {
    setDriveImportOpen(false);
    if (files.length === 0) return;

    try {
      const previousTemporary = temporaryObjectUpload;
      const result = await importFromDriveMutation.mutateAsync({
        files,
        folder: selectedFolder,
      });
      const imported = result.uploaded ?? [];
      if (imported.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files imported.');
      }

      if (driveImportMode === 'temporary-object') {
        const primary = imported[0]!;
        setTemporaryObjectUpload({
          id: primary.id,
          filepath: primary.filepath,
          filename: primary.filename,
        });
        if (previousTemporary && previousTemporary.id !== primary.id) {
          await deleteStagedAsset(previousTemporary).catch(() => {
            // Best-effort cleanup for replaced temporary assets.
          });
        }
        toast('Imported to temporary object slot. Load to canvas to create a card.', { variant: 'success' });
      } else if (driveImportMode === 'replace') {
        const targetId = driveImportTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for replacement.');
        }
        const primary = imported[0]!;
        await updateSlotMutation.mutateAsync({
          id: targetId,
          data: {
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        });
        setSelectedSlotId(targetId);
        toast('Card image updated.', { variant: 'success' });
      } else {
        const primary = imported[0]!;
        const created = await createSlots([
          {
            name: toSlotName(primary.filename || '', 0),
            ...(selectedFolder ? { folderPath: selectedFolder } : {}),
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        ]);
        if (created[0]) {
          setSelectedSlotId(created[0].id);
        }
        toast('Created card from import.', {
          variant: 'success',
        });
      }
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Import failed', { variant: 'error' });
    } finally {
      setDriveImportMode('create');
      setDriveImportTargetId(null);
    }
  };

  const handleCreateEmptySlot = async () => {
    setSlotCreateOpen(false);
    try {
      const created = await createSlots([
        {
          name: `Card ${slots.length + 1}`,
          ...(selectedFolder ? { folderPath: selectedFolder } : {}),
        },
      ]);
      if (created[0]) setSelectedSlotId(created[0].id);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create card', { variant: 'error' });
    }
  };

  const triggerLocalUpload = (mode: 'create' | 'replace' | 'temporary-object', targetId: string | null): void => {
    setLocalUploadMode(mode);
    setLocalUploadTargetId(targetId);
    window.setTimeout(() => localUploadInputRef.current?.click(), 0);
  };

  const handleLocalUpload = async (filesList: FileList | null): Promise<void> => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);
    try {
      const previousTemporary = temporaryObjectUpload;
      const result = await uploadMutation.mutateAsync({
        files,
        folder: selectedFolder,
      });
      const uploaded = result.uploaded ?? [];
      if (uploaded.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files uploaded.');
      }

      if (localUploadMode === 'temporary-object') {
        const primary = uploaded[0]!;
        setTemporaryObjectUpload({
          id: primary.id,
          filepath: primary.filepath,
          filename: primary.filename,
        });
        if (previousTemporary && previousTemporary.id !== primary.id) {
          await deleteStagedAsset(previousTemporary).catch(() => {
            // Best-effort cleanup for replaced temporary assets.
          });
        }
        toast('Uploaded to temporary object slot. Load to canvas to create a card.', { variant: 'success' });
      } else if (localUploadMode === 'replace') {
        const targetId = localUploadTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target card selected for replacement.');
        }
        const primary = uploaded[0]!;
        await updateSlotMutation.mutateAsync({
          id: targetId,
          data: {
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        });
        setSelectedSlotId(targetId);
        toast('Card image uploaded and attached.', { variant: 'success' });
      } else {
        const primary = uploaded[0]!;
        const created = await createSlots([
          {
            name: toSlotName(primary.filename || '', 0),
            ...(selectedFolder ? { folderPath: selectedFolder } : {}),
            imageFileId: primary.id,
            imageUrl: primary.filepath,
            imageBase64: null,
          },
        ]);
        if (created[0]) {
          setSelectedSlotId(created[0].id);
        }
        toast('Uploaded and created card.', {
          variant: 'success',
        });
      }
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Upload failed', { variant: 'error' });
    } finally {
      if (localUploadInputRef.current) {
        localUploadInputRef.current.value = '';
      }
      setLocalUploadTargetId(null);
      setLocalUploadMode('create');
    }
  };

  const handleSaveInlineSlot = async () => {
    if (!selectedSlot) return;
    setSlotUpdateBusy(true);
    try {
      const hasManualImage = Boolean(slotImageUrlDraft.trim() || slotBase64Draft.trim());
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          name: slotNameDraft.trim() || selectedSlot.name || `Card ${slots.length + 1}`,
          folderPath: slotFolderDraft.trim(),
          imageUrl: slotImageUrlDraft.trim() || null,
          imageBase64: slotBase64Draft.trim() || null,
          ...(hasManualImage ? { imageFileId: null } : {}),
        },
      });
      setSlotInlineEditOpen(false);
      toast('Card updated.', { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to update card', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  };

  const handleClearSlotImage = async () => {
    if (!selectedSlot) return;
    setSlotUpdateBusy(true);
    try {
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          imageFileId: null,
          imageUrl: null,
          imageBase64: null,
        },
      });
      setSlotImageUrlDraft('');
      setSlotBase64Draft('');
      toast('Card image cleared.', { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to clear card image', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  };

  const appendExtractHistoryEntry = (
    entry: Omit<PromptExtractHistoryEntry, 'id' | 'createdAt'>
  ): void => {
    const nextId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setExtractHistory((prev: PromptExtractHistoryEntry[]) => {
      const next: PromptExtractHistoryEntry[] = [
        {
          id: nextId,
          createdAt: Date.now(),
          ...entry,
        },
        ...prev,
      ];
      return next.slice(0, 25);
    });
    setSelectedExtractHistoryId(nextId);
  };

  const handleProgrammaticExtraction = async () => {
    const promptBefore = extractDraftPrompt;
    setExtractBusy('programmatic');
    setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: 'programmatic',
        applyAutofix: studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;
      if (
        studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        setExtractDraftPrompt(promptAfter);
      }

      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'programmatic',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? 'programmatic',
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });
      const validationSuffix = studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${before.length} -> ${after.length}.`
        : '';
      toast(`Programmatic extraction completed.${validationSuffix}`, { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Programmatic extraction failed';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleSmartExtraction = async () => {
    const promptBefore = extractDraftPrompt;
    setExtractBusy('smart');
    setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: studioSettings.promptExtraction.mode,
        applyAutofix: studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;

      if (
        studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        setExtractDraftPrompt(promptAfter);
      }

      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'smart',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? studioSettings.promptExtraction.mode,
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });

      const sourceLabel =
        result.source === 'gpt'
          ? 'AI'
          : result.source === 'programmatic_autofix'
            ? 'Programmatic + Autofix'
            : 'Programmatic';
      const fallbackSuffix = result.fallbackUsed ? ' (fallback used)' : '';
      const beforeCount = before.length;
      const afterCount = after.length;
      const validationSuffix = studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${beforeCount} -> ${afterCount}.`
        : '';
      toast(
        `Smart extraction completed via ${sourceLabel}${fallbackSuffix}.${validationSuffix}`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Smart extraction failed';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleAiExtraction = async () => {
    const promptBefore = extractDraftPrompt;
    setExtractBusy('ai');
    setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: 'gpt',
        applyAutofix: studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;
      if (
        studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        setExtractDraftPrompt(promptAfter);
      }
      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'ai',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? 'gpt',
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });
      const sourceLabel = result.source === 'gpt' ? 'AI' : 'Programmatic fallback';
      const fallbackSuffix = result.fallbackUsed ? ' (fallback used)' : '';
      const validationSuffix = studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${before.length} -> ${after.length}.`
        : '';
      toast(`${sourceLabel} extraction completed${fallbackSuffix}.${validationSuffix}`, { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI extraction failed';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleSuggestUiControls = async () => {
    if (!previewParams) {
      toast('Extract params first.', { variant: 'info' });
      return;
    }
    setExtractBusy('ui');
    setExtractError(null);
    try {
      const mode = studioSettings.uiExtractor.mode;
      const heuristic = buildHeuristicControls(previewParams, previewSpecs);
      let aiSuggestions: UiExtractorSuggestion[] = [];

      if (mode === 'ai' || mode === 'both') {
        const flattened = flattenParams(previewParams).filter((leaf) => Boolean(leaf.path));
        const response = await api.post<{ suggestions?: Array<{ path?: string; control?: string }> }>(
          '/api/image-studio/ui-extractor',
          {
            prompt: extractDraftPrompt,
            params: flattened.map((leaf) => ({
              path: leaf.path,
              value: leaf.value,
              spec: previewSpecs?.[leaf.path] ?? null,
            })),
            mode,
          }
        );
        aiSuggestions = (response.suggestions ?? [])
          .filter((item): item is { path: string; control: string } => Boolean(item?.path && item?.control))
          .map((item) => ({ path: item.path, control: item.control as ParamUiControl }))
          .filter((item) => isParamUiControl(item.control));
      }

      const nextControls: Record<string, ParamUiControl> = {};
      if (mode === 'heuristic' || mode === 'both') {
        Object.assign(nextControls, heuristic);
      }
      aiSuggestions.forEach((item) => {
        nextControls[item.path] = item.control;
      });
      setPreviewControls(nextControls);
      setExtractPreviewUiOverrides(nextControls);
      toast('UI selector suggestions updated.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to suggest UI controls';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleApplyExtraction = () => {
    if (!previewParams) {
      toast('Extract params first.', { variant: 'info' });
      return;
    }
    setPromptText(extractDraftPrompt);
    setParamsState(previewParams);
    setParamSpecs(previewSpecs);
    setParamUiOverrides(previewControls);
    setExtractPreviewUiOverrides(previewControls);
    setExtractReviewOpen(false);
    toast('Prompt params applied.', { variant: 'success' });
  };

  const driveImportTitle =
    driveImportMode === 'replace'
      ? 'Attach Image To Selected Card'
      : driveImportMode === 'temporary-object'
        ? 'Select Object Image'
        : 'Import Images';

  return (
    <>
      <input
        ref={localUploadInputRef}
        type='file'
        accept='image/*'
        multiple={false}
        className='hidden'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          void handleLocalUpload(event.target.files);
        }}
      />
      <AppModal
        open={driveImportOpen}
        onClose={() => {
          setDriveImportOpen(false);
          setDriveImportMode('create');
          setDriveImportTargetId(null);
        }}
        title={driveImportTitle}
        size='xl'
      >
        <div className='mb-3 flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              setLocalUploadMode(driveImportMode);
              setLocalUploadTargetId(
                driveImportMode === 'replace' ? (driveImportTargetId ?? selectedSlot?.id ?? null) : null
              );
              window.setTimeout(() => localUploadInputRef.current?.click(), 0);
            }}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Upload From Computer
          </Button>
          <span className='text-xs text-gray-400'>
            Or select existing files below.
          </span>
        </div>
        <FileManager
          mode='select'
          selectionMode='single'
          onSelectFile={(files) => {
            void handleDriveSelection(files);
          }}
        />
      </AppModal>

      <AppModal
        open={slotCreateOpen}
        onClose={() => setSlotCreateOpen(false)}
        title='New Card'
        size='md'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <Button
            variant='outline'
            onClick={() => {
              void handleCreateEmptySlot();
            }}
            disabled={!projectId}
            className='w-full'
          >
            Create Empty Card
          </Button>
          <Button
            onClick={() => {
              setSlotCreateOpen(false);
              setDriveImportMode('create');
              setDriveImportTargetId(null);
              setDriveImportOpen(true);
            }}
            disabled={!projectId}
            className='w-full'
          >
            Create Card From Image
          </Button>
          <Button
            variant='outline'
            onClick={() => {
              setSlotCreateOpen(false);
              triggerLocalUpload('create', null);
            }}
            disabled={!projectId || uploadMutation.isPending}
            className='w-full'
          >
            {uploadMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Create Card From Local Upload
          </Button>
        </div>
      </AppModal>

      <AppModal
        open={slotInlineEditOpen}
        onClose={() => setSlotInlineEditOpen(false)}
        title='Edit Card'
        size='lg'
      >
        {selectedSlot ? (
          <div className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Card Name</Label>
                <Input
                  value={slotNameDraft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlotNameDraft(event.target.value)}
                  className='h-9'
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Folder Path</Label>
                <Input
                  value={slotFolderDraft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlotFolderDraft(event.target.value)}
                  placeholder='e.g. variants/red'
                  className='h-9'
                />
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-xs text-gray-400'>Image URL</Label>
              <Input
                value={slotImageUrlDraft}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlotImageUrlDraft(event.target.value)}
                placeholder='/uploads/... or https://...'
                className='h-9'
              />
            </div>

            <div className='space-y-1'>
              <Label className='text-xs text-gray-400'>Image Base64 (optional)</Label>
              <Textarea
                value={slotBase64Draft}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSlotBase64Draft(event.target.value)}
                className='h-28 font-mono text-[11px]'
                placeholder='data:image/png;base64,...'
              />
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setSlotInlineEditOpen(false);
                  setDriveImportMode('replace');
                  setDriveImportTargetId(selectedSlot.id);
                  setDriveImportOpen(true);
                }}
              >
                Replace From Drive
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setSlotInlineEditOpen(false);
                  triggerLocalUpload('replace', selectedSlot.id);
                }}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                Replace From Local Upload
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void handleClearSlotImage();
                }}
                disabled={slotUpdateBusy}
              >
                Clear Image
              </Button>
              <Button
                type='button'
                onClick={() => {
                  void handleSaveInlineSlot();
                }}
                disabled={slotUpdateBusy}
              >
                {slotUpdateBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
                Save Card
              </Button>
            </div>
          </div>
        ) : (
          <div className='text-sm text-gray-400'>Select a card first.</div>
        )}
      </AppModal>

      <AppModal
        open={extractReviewOpen}
        onClose={() => setExtractReviewOpen(false)}
        title='Extract Prompt Params'
        size='xl'
      >
        <div className='space-y-4'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Prompt Source</Label>
            <Textarea
              value={extractDraftPrompt}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setExtractDraftPrompt(event.target.value)}
              className='h-36 font-mono text-[11px]'
              placeholder='Paste prompt text with params object...'
            />
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              onClick={() => {
                void handleSmartExtraction();
              }}
              disabled={extractBusy !== 'none'}
            >
              {extractBusy === 'smart' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Smart Extract
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleProgrammaticExtraction();
              }}
              disabled={extractBusy !== 'none'}
            >
              {extractBusy === 'programmatic' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Programmatic Extract
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleAiExtraction();
              }}
              disabled={extractBusy !== 'none'}
            >
              {extractBusy === 'ai' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              AI Only
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleSuggestUiControls();
              }}
              disabled={!previewParams || extractBusy !== 'none'}
            >
              {extractBusy === 'ui' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Suggest Selectors
            </Button>
            <Button
              type='button'
              onClick={handleApplyExtraction}
              disabled={!previewParams}
            >
              Apply
            </Button>
          </div>

          {extractError ? (
            <div className='rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200'>
              {extractError}
            </div>
          ) : null}

          {extractHistory.length > 0 ? (
            <div className='space-y-2 rounded border border-indigo-500/30 bg-indigo-500/5 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='text-xs font-semibold text-indigo-100'>Extraction History</div>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-7 px-2 text-xs text-indigo-100 hover:bg-indigo-500/20'
                  onClick={() => {
                    setExtractHistory([]);
                    setSelectedExtractHistoryId(null);
                  }}
                >
                  Clear History
                </Button>
              </div>
              <div className='grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]'>
                <div className='max-h-60 space-y-1 overflow-auto pr-1'>
                  {extractHistory.map((entry: PromptExtractHistoryEntry) => {
                    const isSelected = selectedExtractHistory?.id === entry.id;
                    const changed = entry.promptBefore !== entry.promptAfter;
                    return (
                      <button
                        key={entry.id}
                        type='button'
                        onClick={() => setSelectedExtractHistoryId(entry.id)}
                        className={`w-full rounded border px-2 py-1.5 text-left text-[11px] transition-colors ${
                          isSelected
                            ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                            : 'border-indigo-500/25 bg-indigo-500/5 text-indigo-100/80 hover:bg-indigo-500/15'
                        }`}
                      >
                        <div className='font-medium'>{getPromptRunKindLabel(entry.runKind)}</div>
                        <div className='text-[10px] text-indigo-100/70'>
                          {formatHistoryTime(entry.createdAt)} | {getPromptSourceLabel(entry.source)}
                        </div>
                        <div className='text-[10px] text-indigo-100/70'>
                          {changed ? 'Prompt changed' : 'No prompt change'} | Validation {entry.validationBeforeCount}
                          {' -> '}
                          {entry.validationAfterCount}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className='space-y-2'>
                  {selectedExtractHistory ? (
                    <>
                      <div className='rounded border border-indigo-500/30 bg-indigo-500/10 p-2 text-[11px] text-indigo-100/90'>
                        <div>
                          <span className='font-semibold'>Run:</span>{' '}
                          {getPromptRunKindLabel(selectedExtractHistory.runKind)}
                        </div>
                        <div>
                          <span className='font-semibold'>Mode:</span>{' '}
                          {selectedExtractHistory.modeRequested ?? 'n/a'}
                          {' | '}
                          <span className='font-semibold'>Source:</span>{' '}
                          {getPromptSourceLabel(selectedExtractHistory.source)}
                          {' | '}
                          <span className='font-semibold'>Autofix:</span>{' '}
                          {selectedExtractHistory.autofixApplied ? 'ON' : 'OFF'}
                          {' | '}
                          <span className='font-semibold'>Fallback:</span>{' '}
                          {selectedExtractHistory.fallbackUsed ? 'YES' : 'NO'}
                        </div>
                      </div>
                      {selectedExtractChanged ? (
                        <div className='max-h-60 overflow-auto rounded border border-indigo-500/30 bg-gray-950/30'>
                          <div className='grid grid-cols-2 border-b border-indigo-500/25 text-[10px] uppercase tracking-wide text-indigo-200/80'>
                            <div className='px-2 py-1'>Before Autofix</div>
                            <div className='px-2 py-1'>After Autofix</div>
                          </div>
                          <div className='divide-y divide-indigo-500/10 font-mono text-[11px]'>
                            {selectedExtractDiffLines.map((line: PromptDiffLine, index: number) => (
                              <div key={`diff-${index}`} className='grid grid-cols-2'>
                                <div
                                  className={`whitespace-pre-wrap break-words px-2 py-1 ${
                                    line.changed ? 'bg-red-500/10 text-red-100' : 'text-gray-300'
                                  }`}
                                >
                                  {line.before ?? '\u2205'}
                                </div>
                                <div
                                  className={`whitespace-pre-wrap break-words px-2 py-1 ${
                                    line.changed ? 'bg-emerald-500/10 text-emerald-100' : 'text-gray-300'
                                  }`}
                                >
                                  {line.after ?? '\u2205'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className='rounded border border-indigo-500/25 bg-indigo-500/5 p-2 text-xs text-indigo-100/80'>
                          No prompt formatting differences for this extraction.
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {studioSettings.promptExtraction.showValidationSummary && previewValidation ? (
            <div className='grid gap-2 rounded border border-cyan-500/35 bg-cyan-500/5 p-3 text-xs text-cyan-100 md:grid-cols-2'>
              <div className='space-y-1'>
                <div className='font-medium text-cyan-200'>Validation Before: {previewValidation.before.length}</div>
                {previewValidation.before.length === 0 ? (
                  <div className='text-cyan-100/70'>No issues.</div>
                ) : (
                  <div className='space-y-1'>
                    {previewValidation.before.slice(0, 6).map((issue, index) => (
                      <div key={`before-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1'>
                        <div className='text-cyan-100'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                        <div className='text-cyan-100/70'>{issue.message ?? ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className='space-y-1'>
                <div className='font-medium text-cyan-200'>Validation After: {previewValidation.after.length}</div>
                {previewValidation.after.length === 0 ? (
                  <div className='text-cyan-100/70'>No issues.</div>
                ) : (
                  <div className='space-y-1'>
                    {previewValidation.after.slice(0, 6).map((issue, index) => (
                      <div key={`after-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1'>
                        <div className='text-cyan-100'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                        <div className='text-cyan-100/70'>{issue.message ?? ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {previewLeaves.length > 0 ? (
            <div className='max-h-72 overflow-auto rounded border border-border/60 bg-card/50'>
              <div className='grid grid-cols-[1.6fr_1fr_1fr] gap-2 border-b border-border/50 px-3 py-2 text-[11px] text-gray-400'>
                <div>Path</div>
                <div>Value</div>
                <div>Selector</div>
              </div>
              <div className='divide-y divide-border/40'>
                {previewLeaves.map((leaf) => (
                  <div
                    key={leaf.path}
                    className='grid grid-cols-[1.6fr_1fr_1fr] gap-2 px-3 py-2 text-[11px]'
                  >
                    <div className='truncate font-mono text-gray-200' title={leaf.path}>
                      {leaf.path}
                    </div>
                    <div className='truncate text-gray-300' title={JSON.stringify(leaf.value)}>
                      {typeof leaf.value === 'string' ? leaf.value : JSON.stringify(leaf.value)}
                    </div>
                    <div className='truncate text-gray-400'>
                      {previewControls[leaf.path] ?? 'auto'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              Extracted params will appear here.
            </div>
          )}
        </div>
      </AppModal>
    </>
  );
}
