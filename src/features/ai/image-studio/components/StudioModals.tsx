'use client';

import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import FileManager from '@/features/files/components/FileManager';
import {
  extractParamsFromPrompt,
  flattenParams,
  inferParamSpecs,
  type ParamSpec,
} from '@/features/prompt-engine/prompt-params';
import { api } from '@/shared/lib/api-client';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { Button, Input, Label, SharedModal, Textarea, useToast } from '@/shared/ui';

import { useImageStudio } from '../context/ImageStudioContext';
import { isParamUiControl, recommendParamUiControl, type ParamUiControl } from '../utils/param-ui';

type UiExtractorSuggestion = {
  path: string;
  control: ParamUiControl;
};

function toSlotName(filename: string, index: number): string {
  const clean = filename.trim();
  if (!clean) return `Slot ${index + 1}`;
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
  const {
    projectId,
    slots,
    selectedFolder,
    selectedSlot,
    setSelectedSlotId,
    createSlots,
    updateSlotMutation,
    slotCreateOpen,
    setSlotCreateOpen,
    driveImportOpen,
    setDriveImportOpen,
    driveImportMode,
    setDriveImportMode,
    driveImportTargetId,
    setDriveImportTargetId,
    importFromDriveMutation,
    uploadMutation,
    slotInlineEditOpen,
    setSlotInlineEditOpen,
    slotImageUrlDraft,
    setSlotImageUrlDraft,
    slotBase64Draft,
    setSlotBase64Draft,
    slotUpdateBusy,
    setSlotUpdateBusy,
    extractReviewOpen,
    setExtractReviewOpen,
    extractDraftPrompt,
    setExtractDraftPrompt,
    setPromptText,
    setParamsState,
    setParamSpecs,
    setParamUiOverrides,
    setExtractPreviewUiOverrides,
    studioSettings,
  } = useImageStudio();

  const [slotNameDraft, setSlotNameDraft] = useState('');
  const [slotFolderDraft, setSlotFolderDraft] = useState('');

  const [extractBusy, setExtractBusy] = useState<'none' | 'programmatic' | 'ai' | 'ui'>('none');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [previewParams, setPreviewParams] = useState<Record<string, unknown> | null>(null);
  const [previewSpecs, setPreviewSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [previewControls, setPreviewControls] = useState<Record<string, ParamUiControl>>({});
  const localUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [localUploadMode, setLocalUploadMode] = useState<'create' | 'replace'>('create');
  const [localUploadTargetId, setLocalUploadTargetId] = useState<string | null>(null);

  const previewLeaves = useMemo(
    () => (previewParams ? flattenParams(previewParams).filter((leaf) => Boolean(leaf.path)) : []),
    [previewParams]
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
    setExtractPreviewUiOverrides({});
  }, [extractReviewOpen, setExtractPreviewUiOverrides]);

  const handleDriveSelection = async (files: ImageFileSelection[]) => {
    setDriveImportOpen(false);
    if (files.length === 0) return;

    try {
      const result = await importFromDriveMutation.mutateAsync({
        files,
        folder: selectedFolder,
      });
      const imported = result.uploaded ?? [];
      if (imported.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files imported.');
      }

      if (driveImportMode === 'replace') {
        const targetId = driveImportTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target slot selected for replacement.');
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
        toast('Slot image updated.', { variant: 'success' });
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
        toast('Created slot from import.', {
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
          name: `Slot ${slots.length + 1}`,
          ...(selectedFolder ? { folderPath: selectedFolder } : {}),
        },
      ]);
      if (created[0]) setSelectedSlotId(created[0].id);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create slot', { variant: 'error' });
    }
  };

  const triggerLocalUpload = (mode: 'create' | 'replace', targetId: string | null): void => {
    setLocalUploadMode(mode);
    setLocalUploadTargetId(targetId);
    window.setTimeout(() => localUploadInputRef.current?.click(), 0);
  };

  const handleLocalUpload = async (filesList: FileList | null): Promise<void> => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);
    try {
      const result = await uploadMutation.mutateAsync({
        files,
        folder: selectedFolder,
      });
      const uploaded = result.uploaded ?? [];
      if (uploaded.length === 0) {
        throw new Error(result.failures?.[0]?.error || 'No files uploaded.');
      }

      if (localUploadMode === 'replace') {
        const targetId = localUploadTargetId ?? selectedSlot?.id ?? null;
        if (!targetId) {
          throw new Error('No target slot selected for replacement.');
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
        toast('Slot image uploaded and attached.', { variant: 'success' });
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
        toast('Uploaded and created slot.', {
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
          name: slotNameDraft.trim() || selectedSlot.name || `Slot ${slots.length + 1}`,
          folderPath: slotFolderDraft.trim(),
          imageUrl: slotImageUrlDraft.trim() || null,
          imageBase64: slotBase64Draft.trim() || null,
          ...(hasManualImage ? { imageFileId: null } : {}),
        },
      });
      setSlotInlineEditOpen(false);
      toast('Slot updated.', { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to update slot', { variant: 'error' });
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
      toast('Slot image cleared.', { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to clear slot image', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  };

  const handleProgrammaticExtraction = async () => {
    setExtractBusy('programmatic');
    setExtractError(null);
    try {
      const result = extractParamsFromPrompt(extractDraftPrompt);
      if (!result.ok) {
        throw new Error(result.error);
      }
      const specs = inferParamSpecs(result.params, result.rawObjectText);
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      toast('Programmatic extraction completed.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Programmatic extraction failed';
      setExtractError(message);
      toast(message, { variant: 'error' });
    } finally {
      setExtractBusy('none');
    }
  };

  const handleAiExtraction = async () => {
    setExtractBusy('ai');
    setExtractError(null);
    try {
      const result = await api.post<{ params?: Record<string, unknown> }>('/api/image-studio/prompt-extract', {
        prompt: extractDraftPrompt,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      setPreviewParams(result.params);
      setPreviewSpecs(specs);
      setPreviewControls(heuristic);
      setExtractPreviewUiOverrides(heuristic);
      toast('AI extraction completed.', { variant: 'success' });
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
    driveImportMode === 'replace' ? 'Attach Image To Selected Slot' : 'Import Images';

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
      <SharedModal
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
            onClick={() => triggerLocalUpload(driveImportMode, driveImportMode === 'replace' ? (driveImportTargetId ?? selectedSlot?.id ?? null) : null)}
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
      </SharedModal>

      <SharedModal
        open={slotCreateOpen}
        onClose={() => setSlotCreateOpen(false)}
        title='New Slot'
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
            Create Empty Slot
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
            Create Slot From Image
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
            Create Slot From Local Upload
          </Button>
        </div>
      </SharedModal>

      <SharedModal
        open={slotInlineEditOpen}
        onClose={() => setSlotInlineEditOpen(false)}
        title='Edit Slot'
        size='lg'
      >
        {selectedSlot ? (
          <div className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Slot Name</Label>
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
                Save Slot
              </Button>
            </div>
          </div>
        ) : (
          <div className='text-sm text-gray-400'>Select a slot first.</div>
        )}
      </SharedModal>

      <SharedModal
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
              AI Extract
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
      </SharedModal>
    </>
  );
}
