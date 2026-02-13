'use client';

import { Copy, FolderPlus, ImageOff, ImagePlus, Locate, Plus, Settings2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  UnifiedButton,
  SectionPanel,
  Tooltip,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  ImageStudioSingleSlotManager,
  type ImageStudioSingleSlotManagerHandle,
} from './ImageStudioSingleSlotManager';
import { ShapeListPanel } from './ShapeListPanel';
import { SlotTree } from './SlotTree';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions } from '../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { useUiState } from '../context/UiContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import {
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  getImageStudioProjectSessionKey,
  serializeImageStudioActiveProject,
  serializeImageStudioProjectSession,
  type ImageStudioProjectSession,
} from '../utils/project-session';

export function LeftSidebar(): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { isFocusMode } = useUiState();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { saveStudioSettings } = useSettingsActions();
  const { promptText, paramsState, paramSpecs, paramUiOverrides } = usePromptState();
  const { maskShapes } = useMaskingState();
  const {
    slots,
    virtualFolders,
    selectedSlot,
    selectedSlotId,
    selectedFolder,
    workingSlot,
    workingSlotId,
    previewMode,
    compositeAssetIds,
    temporaryObjectUpload,
  } = useSlotsState();
  const {
    setSlotInlineEditOpen,
    setSelectedSlotId,
    setWorkingSlotId,
    setPreviewMode,
    createSlots,
    createFolderMutation,
  } = useSlotsActions();
  const {
    setMaskShapes,
    setActiveMaskId,
    setSelectedPointIndex,
  } = useMaskingActions();

  const { toast } = useToast();
  const [revealRequest, setRevealRequest] = useState<{ slotId: string; nonce: number } | null>(null);
  const [projectSaveBusy, setProjectSaveBusy] = useState(false);
  const singleSlotManagerRef = useRef<ImageStudioSingleSlotManagerHandle | null>(null);
  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const selectedSlotImageSrc = selectedSlot
    ? getImageStudioSlotImageSrc(selectedSlot, productImagesExternalBaseUrl)
    : null;
  const canLoadToCanvas = Boolean(projectId) && Boolean(temporaryObjectUpload || (selectedSlot?.id && selectedSlotImageSrc));

  const cloneSettingValue = <T,>(value: T): T => {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  };

  const handleLoadToCanvas = (): void => {
    void (async (): Promise<void> => {
      const consumedTemporaryUpload =
        (await singleSlotManagerRef.current?.consumeTemporaryObjectUpload({ loadToCanvas: true })) ?? false;
      if (consumedTemporaryUpload) return;

      if (selectedSlot?.id && selectedSlotImageSrc) {
        setPreviewMode('image');
        setWorkingSlotId(selectedSlot.id);
        return;
      }
      toast('Load to canvas is only available for Object slot upload or a card with an image.', { variant: 'info' });
    })();
  };

  const handleDeCanvas = (): void => {
    setWorkingSlotId(null);
    setMaskShapes([]);
    setActiveMaskId(null);
    setSelectedPointIndex(null);
  };

  const handleRevealInTree = (): void => {
    const targetSlotId = workingSlot?.id ?? null;
    if (!targetSlotId) {
      toast('No card is currently loaded in the preview.', { variant: 'info' });
      return;
    }
    setSelectedSlotId(targetSlotId);
    setRevealRequest((prev) => ({
      slotId: targetSlotId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  };

  const handleCreateFolder = (): void => {
    const normalizePath = (value: string): string =>
      value.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

    const selectedParent = normalizePath(selectedFolder);
    const allFolderPaths = new Set<string>();
    virtualFolders.forEach((folderPath: string) => {
      const normalized = normalizePath(folderPath);
      if (normalized) allFolderPaths.add(normalized);
    });
    slots.forEach((slot) => {
      const normalized = normalizePath(slot.folderPath ?? '');
      if (normalized) allFolderPaths.add(normalized);
    });

    const siblingFolderNames = new Set<string>();
    allFolderPaths.forEach((folderPath: string) => {
      const parent = folderPath.includes('/') ? folderPath.slice(0, folderPath.lastIndexOf('/')) : '';
      if (parent !== selectedParent) return;
      const leaf = folderPath.includes('/') ? folderPath.slice(folderPath.lastIndexOf('/') + 1) : folderPath;
      if (!leaf) return;
      siblingFolderNames.add(leaf.toLowerCase());
    });

    const baseName = 'New Folder';
    let suffix = 1;
    let nextLeaf = baseName;
    while (siblingFolderNames.has(nextLeaf.toLowerCase())) {
      suffix += 1;
      nextLeaf = `${baseName} ${suffix}`;
    }

    const nextPath = selectedParent ? `${selectedParent}/${nextLeaf}` : nextLeaf;
    void createFolderMutation.mutateAsync(nextPath).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to create folder', { variant: 'error' });
    });
  };

  const handleCreateCardFromLoadedImage = (): void => {
    void (async (): Promise<void> => {
      const consumedTemporaryUpload =
        (await singleSlotManagerRef.current?.consumeTemporaryObjectUpload({ loadToCanvas: true })) ?? false;
      if (consumedTemporaryUpload) {
        toast('Created card from loaded image.', { variant: 'success' });
        return;
      }

      const sourceSlot = workingSlot ?? selectedSlot;
      const sourceImageUrl = sourceSlot?.imageUrl?.trim() || sourceSlot?.imageFile?.filepath || null;
      const sourceImageBase64 = sourceSlot?.imageBase64?.trim() || null;
      const sourceImageFileId = sourceSlot?.imageFileId ?? null;
      const hasSourceImage = Boolean(sourceImageFileId || sourceImageUrl || sourceImageBase64);

      if (!sourceSlot || !hasSourceImage) {
        toast('Load an image first, then create a card from it.', { variant: 'info' });
        return;
      }

      const targetFolder = sourceSlot.folderPath?.trim() || selectedFolder.trim();
      const created = await createSlots([
        {
          name: sourceSlot.name?.trim() ? `${sourceSlot.name.trim()} Copy` : `Card ${Date.now()}`,
          ...(targetFolder ? { folderPath: targetFolder } : {}),
          ...(sourceImageFileId ? { imageFileId: sourceImageFileId } : {}),
          ...(sourceImageUrl ? { imageUrl: sourceImageUrl } : {}),
          ...(sourceImageBase64 ? { imageBase64: sourceImageBase64 } : {}),
        },
      ]);

      const nextCard = created[0] ?? null;
      if (!nextCard) {
        throw new Error('Failed to create card from loaded image.');
      }
      setSelectedSlotId(nextCard.id);
      setPreviewMode('image');
      setWorkingSlotId(nextCard.id);
      toast('Created card from loaded image.', { variant: 'success' });
    })().catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to create card from loaded image.', { variant: 'error' });
    });
  };

  const handleCopyActiveCardName = (): void => {
    const cardLabel = selectedSlot?.name?.trim() || selectedSlot?.id || null;
    if (!cardLabel) {
      toast('Select a card first.', { variant: 'info' });
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast('Clipboard is not available in this browser.', { variant: 'error' });
      return;
    }
    void navigator.clipboard.writeText(cardLabel).then(() => {
      toast('Card name copied.', { variant: 'success' });
    }).catch(() => {
      toast('Failed to copy card name.', { variant: 'error' });
    });
  };

  const handleSaveProject = (): void => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }
    const projectSessionKey = getImageStudioProjectSessionKey(normalizedProjectId);
    if (!projectSessionKey) {
      toast('Invalid project id.', { variant: 'error' });
      return;
    }
    if (projectSaveBusy) return;

    const projectSession: ImageStudioProjectSession = {
      version: 1,
      projectId: normalizedProjectId,
      savedAt: new Date().toISOString(),
      selectedFolder,
      selectedSlotId,
      workingSlotId,
      compositeAssetIds: cloneSettingValue(compositeAssetIds),
      previewMode,
      promptText,
      paramsState: cloneSettingValue(paramsState),
      paramSpecs: cloneSettingValue((paramSpecs ?? null) as Record<string, unknown> | null),
      paramUiOverrides: cloneSettingValue((paramUiOverrides ?? {}) as Record<string, unknown>),
    };

    setProjectSaveBusy(true);
    void (async (): Promise<void> => {
      let serializedSession: string;
      try {
        serializedSession = serializeImageStudioProjectSession(projectSession);
      } catch (error: unknown) {
        throw new Error(
          error instanceof Error
            ? `Failed to serialize project session: ${error.message}`
            : 'Failed to serialize project session.'
        );
      }

      await updateSetting.mutateAsync({
        key: projectSessionKey,
        value: serializedSession,
      });

      // Persist active project as a best-effort write (primary project save already completed).
      void updateSetting.mutateAsync({
        key: IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
        value: serializeImageStudioActiveProject(normalizedProjectId),
      }).catch(() => {});

      try {
        await saveStudioSettings({ silent: true });
      } catch (error: unknown) {
        toast(
          `Project "${normalizedProjectId}" saved. Studio settings were not saved${
            error instanceof Error ? `: ${error.message}` : '.'
          }`,
          { variant: 'warning' }
        );
        return;
      }

      toast(`Project "${normalizedProjectId}" saved.`, { variant: 'success' });
    })()
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : 'Failed to save project.', { variant: 'error' });
      })
      .finally(() => {
        setProjectSaveBusy(false);
      });
  };

  useEffect(() => {
    setRevealRequest(null);
  }, [projectId]);

  return (
    <>
      <SectionPanel
        className={cn(
          'order-1 flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out p-0',
          isFocusMode && 'pointer-events-none opacity-0 -translate-x-2'
        )}
        variant='subtle'
        aria-hidden={isFocusMode}
      >
        <div className='grid min-h-0 flex-1 grid-rows-[auto_auto_auto_auto_clamp(240px,38vh,420px)_minmax(160px,1fr)] gap-3 overflow-hidden p-4'>
          <div className='flex items-center justify-start px-1 py-1' data-preserve-slot-selection='true'>
            <UnifiedButton
              type='button'
              variant='outline'
              size='sm'
              className='h-7 px-2 text-[11px]'
              title='Save current Image Studio project state'
              aria-label='Save current Image Studio project state'
              disabled={projectSaveBusy || !projectId.trim()}
              onClick={handleSaveProject}
              data-preserve-slot-selection='true'
            >
              {projectSaveBusy ? 'Saving...' : 'Save Project'}
            </UnifiedButton>
          </div>
          <div
            className='flex items-center gap-2 px-1 py-1 text-[11px] text-gray-400'
            data-preserve-slot-selection='true'
          >
            <span className='min-w-0 flex-1 truncate'>
              {selectedSlot
                ? selectedSlot.name || selectedSlot.id
                : 'No active card selected. Pick a card from the tree.'}
            </span>
            <Tooltip content={selectedSlot ? 'Copy card name' : 'Select a card first'}>
              <UnifiedButton
                type='button'
                size='icon'
                variant='ghost'
                className='size-5 shrink-0'
                onClick={handleCopyActiveCardName}
                disabled={!selectedSlot?.id}
                title='Copy card name'
                aria-label='Copy card name'
                data-preserve-slot-selection='true'
              >
                <Copy className='size-3' />
              </UnifiedButton>
            </Tooltip>
          </div>

          <ImageStudioSingleSlotManager ref={singleSlotManagerRef} />

          <div className='flex flex-wrap items-center justify-start gap-2' data-preserve-slot-selection='true'>
            <Tooltip content='Load to canvas'>
              <UnifiedButton
                type='button'
                size='icon'
                variant='outline'
                title='Load to canvas'
                onClick={handleLoadToCanvas}
                disabled={!canLoadToCanvas}
                aria-label='Load to canvas'
              >
                <ImagePlus className='size-4' />
              </UnifiedButton>
            </Tooltip>
            <Tooltip content='De-canvas'>
              <UnifiedButton
                type='button'
                size='icon'
                variant='outline'
                title='De-canvas'
                onClick={handleDeCanvas}
                disabled={!workingSlot}
                aria-label='De-canvas'
              >
                <ImageOff className='size-4' />
              </UnifiedButton>
            </Tooltip>
            <Tooltip content='Reveal in tree'>
              <UnifiedButton
                type='button'
                size='icon'
                variant='outline'
                title='Reveal in tree'
                onClick={handleRevealInTree}
                disabled={!workingSlot}
                aria-label='Reveal in tree'
              >
                <Locate className='size-4' />
              </UnifiedButton>
            </Tooltip>
            <Tooltip content='New Card'>
              <UnifiedButton
                type='button'
                size='icon'
                variant='outline'
                title='New Card'
                onClick={handleCreateCardFromLoadedImage}
                disabled={!projectId}
                aria-label='New Card'
              >
                <Plus className='size-4' />
              </UnifiedButton>
            </Tooltip>
            <Tooltip content='New folder'>
              <UnifiedButton
                type='button'
                size='icon'
                variant='outline'
                title='New folder'
                onClick={handleCreateFolder}
                disabled={!projectId || createFolderMutation.isPending}
                aria-label='New folder'
              >
                <FolderPlus className='size-4' />
              </UnifiedButton>
            </Tooltip>
            {selectedSlot ? (
              <Tooltip content='Edit card'>
                <UnifiedButton
                  type='button'
                  size='icon'
                  variant='outline'
                  title='Edit card'
                  onClick={() => setSlotInlineEditOpen(true)}
                  aria-label='Edit card'
                >
                  <Settings2 className='size-4' />
                </UnifiedButton>
              </Tooltip>
            ) : null}
          </div>

          <div className='h-full min-h-0 min-w-0 overflow-hidden'>
            <SlotTree key={projectId} revealRequest={revealRequest} />
          </div>

          <div className='min-h-0 overflow-hidden rounded border border-border/60 bg-card/40 p-2'>
            <div className='mb-1 flex items-center justify-between text-[11px] text-gray-400'>
              <span>Shape Layers</span>
              <span>{maskShapes.length}</span>
            </div>
            <div className='h-full overflow-auto pr-1'>
              {maskShapes.length > 0 ? (
                <ShapeListPanel />
              ) : (
                <div className='px-2 py-2 text-xs text-gray-500'>No shapes drawn yet.</div>
              )}
            </div>
          </div>
        </div>
      </SectionPanel>
    </>
  );
}
