'use client';

import { FolderPlus, ImageOff, ImagePlus, Plus, Settings2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  SidePanel,
  Tooltip,
  useToast,
} from '@/shared/ui';

import {
  ImageStudioSingleSlotManager,
  type ImageStudioSingleSlotManagerHandle,
} from './ImageStudioSingleSlotManager';
import { ShapeListPanel } from './ShapeListPanel';
import { SlotTree } from './SlotTree';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { useUiState } from '../context/UiContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import {
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  getImageStudioProjectSessionKey,
  saveImageStudioProjectSessionLocal,
  serializeImageStudioActiveProject,
  serializeImageStudioProjectSession,
  type ImageStudioProjectSession,
} from '../utils/project-session';

const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';

export function LeftSidebar(): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { isFocusMode } = useUiState();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
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
  const [loadToCanvasBusy, setLoadToCanvasBusy] = useState(false);
  const loadToCanvasBusyRef = useRef(false);
  const singleSlotManagerRef = useRef<ImageStudioSingleSlotManagerHandle | null>(null);
  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const selectedSlotImageSrc = selectedSlot
    ? getImageStudioSlotImageSrc(selectedSlot, productImagesExternalBaseUrl)
    : null;
  const canLoadToCanvas = Boolean(
    (temporaryObjectUpload && projectId) ||
    (selectedSlot?.id && selectedSlotImageSrc)
  );

  const cloneSettingValue = <T,>(value: T): T => {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(value, (_key: string, candidate: unknown): unknown => {
      if (typeof candidate === 'bigint') return candidate.toString();
      if (typeof candidate === 'function' || typeof candidate === 'symbol') return undefined;
      if (candidate instanceof Date) return candidate.toISOString();
      if (candidate && typeof candidate === 'object') {
        if (seen.has(candidate)) return undefined;
        seen.add(candidate);
      }
      return candidate;
    });
    if (typeof serialized !== 'string') {
      return value;
    }
    return JSON.parse(serialized) as T;
  };

  const handleLoadToCanvas = (): void => {
    if (loadToCanvasBusyRef.current || loadToCanvasBusy) return;
    loadToCanvasBusyRef.current = true;
    setLoadToCanvasBusy(true);
    void (async (): Promise<void> => {
      const consumedTemporaryUpload =
        (await singleSlotManagerRef.current?.consumeTemporaryObjectUpload({ loadToCanvas: true })) ?? false;
      if (consumedTemporaryUpload) return;

      if (temporaryObjectUpload) {
        toast('Failed to load uploaded image onto canvas. Try uploading again.', { variant: 'error' });
        return;
      }

      if (selectedSlot?.id && selectedSlotImageSrc) {
        setPreviewMode('image');
        setWorkingSlotId(selectedSlot.id);
        return;
      }
      toast('Load to canvas is only available for Object slot upload or a card with an image.', { variant: 'info' });
    })()
      .finally(() => {
        loadToCanvasBusyRef.current = false;
        setLoadToCanvasBusy(false);
      });
  };

  const handleDeCanvas = (): void => {
    setWorkingSlotId(null);
    setMaskShapes([]);
    setActiveMaskId(null);
    setSelectedPointIndex(null);
  };

  const queueRevealInTree = useCallback((targetSlotId: string | null): void => {
    if (!targetSlotId) {
      toast('No card is currently loaded in the preview.', { variant: 'info' });
      return;
    }
    setSelectedSlotId(targetSlotId);
    setRevealRequest((prev) => ({
      slotId: targetSlotId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, [setSelectedSlotId, toast]);

  const handleCreateFolder = (): void => {
    const normalizePath = (value: string): string =>
      value.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

    // When a card is selected, create folder in the card's parent folder.
    // When a folder is selected, create inside it. Otherwise create at root.
    const selectedParent = selectedSlotId
      ? normalizePath(selectedSlot?.folderPath ?? '')
      : normalizePath(selectedFolder);
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

  const handleCreateCardFromLoadedImage = useCallback((): void => {
    void (async (): Promise<void> => {
      const sourceSlot = workingSlot ?? selectedSlot;
      const sourceImageUrl = sourceSlot?.imageUrl?.trim() || sourceSlot?.imageFile?.filepath || null;
      const sourceImageBase64 = sourceSlot?.imageBase64?.trim() || null;
      const sourceImageFileId = sourceSlot?.imageFileId ?? null;
      const hasSourceImage = Boolean(sourceImageFileId || sourceImageUrl || sourceImageBase64);

      // Resolve target folder: card selected → card's folder, folder selected → that folder, else root
      const resolvedTargetFolder = selectedSlotId
        ? (selectedSlot?.folderPath?.trim() ?? '')
        : selectedFolder.trim();

      if (!sourceSlot || !hasSourceImage) {
        // No loaded image — create an empty card in the resolved folder
        const created = await createSlots([
          {
            name: `Card ${Date.now()}`,
            ...(resolvedTargetFolder ? { folderPath: resolvedTargetFolder } : {}),
          },
        ]);
        const nextCard = created[0] ?? null;
        if (!nextCard) {
          throw new Error('Failed to create card.');
        }
        queueRevealInTree(nextCard.id);
        toast('Created empty card.', { variant: 'success' });
        return;
      }

      const targetFolder = sourceSlot.folderPath?.trim() || resolvedTargetFolder;
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
      queueRevealInTree(nextCard.id);
      setPreviewMode('image');
      setWorkingSlotId(nextCard.id);
      toast('Created card from loaded image.', { variant: 'success' });
    })().catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to create card from loaded image.', { variant: 'error' });
    });
  }, [
    createSlots,
    queueRevealInTree,
    selectedFolder,
    selectedSlot,
    selectedSlotId,
    setPreviewMode,
    setWorkingSlotId,
    toast,
    workingSlot,
  ]);

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
      try {
        saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
      } catch {
        // Continue with cloud save; local cache is best-effort.
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

      toast(`Project "${normalizedProjectId}" saved.`, { variant: 'success' });
    })()
      .catch((error: unknown) => {
        try {
          saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
        } catch {
          // Ignore local fallback failures and surface the original error.
        }
        toast(
          error instanceof Error
            ? `Cloud save failed. Local fallback saved: ${error.message}`
            : 'Cloud save failed. Local fallback saved.',
          { variant: 'warning' }
        );
      })
      .finally(() => {
        setProjectSaveBusy(false);
      });
  };

  useEffect(() => {
    setRevealRequest(null);
  }, [projectId]);

  useEffect((): (() => void) => {
    if (typeof window === 'undefined') return () => {};
    const handleRevealEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<{ slotId?: unknown }>;
      const detail = customEvent.detail;
      const eventSlotId =
        detail && typeof detail.slotId === 'string' && detail.slotId.trim().length > 0
          ? detail.slotId.trim()
          : null;
      queueRevealInTree(eventSlotId ?? workingSlot?.id ?? null);
    };
    window.addEventListener(REVEAL_IN_TREE_EVENT, handleRevealEvent as EventListener);
    return (): void => {
      window.removeEventListener(REVEAL_IN_TREE_EVENT, handleRevealEvent as EventListener);
    };
  }, [queueRevealInTree, workingSlot?.id]);

  return (
    <SidePanel
      position='left'
      width={320}
      isFocusMode={isFocusMode}
      className='order-1 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40'
    >
      <div className='grid min-h-0 flex-1 grid-rows-[auto_auto_clamp(240px,38vh,420px)_minmax(160px,1fr)] gap-3 overflow-hidden p-4'>
        <div className='px-1 py-1' data-preserve-slot-selection='true'>
          <Button size='xs'
            type='button'
            variant='outline'
            className='h-7 px-2 text-[11px]'
            title='Save current Image Studio project state'
            aria-label='Save current Image Studio project state'
            disabled={projectSaveBusy || !projectId.trim()}
            onClick={handleSaveProject}
            data-preserve-slot-selection='true'
          >
            {projectSaveBusy ? 'Saving...' : 'Save Project'}
          </Button>
        </div>

        <div
          className='grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2 px-1 py-1'
          data-preserve-slot-selection='true'
        >
          <div className='min-w-0 overflow-hidden'>
            <ImageStudioSingleSlotManager ref={singleSlotManagerRef} />
            {temporaryObjectUpload ? (
              <p className='mt-1 px-1 text-[10px] leading-snug text-amber-300'>
                Temporary upload is staged. Click Load to canvas to create one card and load it.
              </p>
            ) : null}
          </div>
          <div className='flex shrink-0 flex-col items-center gap-2 self-start'>
            <Tooltip content={selectedSlot ? 'Edit card' : 'Select card to edit'}>
              <Button size='xs'
                type='button'
                variant='outline'
                title='Edit card'
                onClick={() => setSlotInlineEditOpen(true)}
                disabled={!selectedSlot}
                aria-label='Edit card'
              >
                <Settings2 className='size-4' />
              </Button>
            </Tooltip>
          </div>
          <div className='flex shrink-0 flex-col items-center gap-2 self-start'>
            <Tooltip content='Load to canvas'>
              <Button size='xs'
                type='button'
                variant='outline'
                title='Load to canvas'
                onClick={handleLoadToCanvas}
                disabled={loadToCanvasBusy || !canLoadToCanvas}
                aria-label='Load to canvas'
              >
                <ImagePlus className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content='De-canvas'>
              <Button size='xs'
                type='button'
                variant='outline'
                title='De-canvas'
                onClick={handleDeCanvas}
                disabled={!workingSlot}
                aria-label='De-canvas'
              >
                <ImageOff className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content='New Card'>
              <Button size='xs'
                type='button'
                variant='outline'
                title='New Card'
                onClick={handleCreateCardFromLoadedImage}
                disabled={!projectId}
                aria-label='New Card'
              >
                <Plus className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content='New folder'>
              <Button size='xs'
                type='button'
                variant='outline'
                title='New folder'
                onClick={handleCreateFolder}
                disabled={!projectId || createFolderMutation.isPending}
                aria-label='New folder'
              >
                <FolderPlus className='size-4' />
              </Button>
            </Tooltip>
          </div>
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
    </SidePanel>
  );
}
