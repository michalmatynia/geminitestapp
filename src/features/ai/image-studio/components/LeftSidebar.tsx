'use client';

import { Copy, FolderPlus, ImageOff, ImagePlus, Plus, Settings2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/utils/image-src';
import {
  getImageStudioProjectSessionKey,
  saveImageStudioProjectSessionLocal,
  serializeImageStudioProjectSession,
  type ImageStudioProjectSession,
} from '@/features/ai/image-studio/utils/project-session';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { buildImageStudioSequenceSnapshot } from '@/features/ai/image-studio/utils/studio-settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/shared/lib/products/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, Input, SidePanel, Tooltip, useToast, CompactEmptyState } from '@/shared/ui';

import {
  ImageStudioSingleSlotManager,
  type ImageStudioSingleSlotManagerHandle,
} from './ImageStudioSingleSlotManager';
import { ShapeListPanel } from './ShapeListPanel';
import { SlotTree } from './SlotTree';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions, useSettingsState } from '../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { useUiState } from '../context/UiContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';

export function LeftSidebar(): React.JSX.Element {
  const { projectId, projectsQuery } = useProjectsState();
  const { handleRenameProject } = useProjectsActions();
  const { isFocusMode } = useUiState();
  const { studioSettings } = useSettingsState();
  const { saveStudioSettings, setStudioSettings } = useSettingsActions();
  const generationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
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
  const { setMaskShapes, setActiveMaskId, setSelectedPointIndex } = useMaskingActions();

  const { toast } = useToast();
  const [revealRequest, setRevealRequest] = useState<{ slotId: string; nonce: number } | null>(
    null
  );
  const [projectSaveBusy, setProjectSaveBusy] = useState(false);
  const [projectRenameEditing, setProjectRenameEditing] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [loadToCanvasBusy, setLoadToCanvasBusy] = useState(false);
  const [duplicateCardBusy, setDuplicateCardBusy] = useState(false);
  const loadToCanvasBusyRef = useRef(false);
  const singleSlotManagerRef = useRef<ImageStudioSingleSlotManagerHandle | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const selectedSlotImageSrc = selectedSlot
    ? getImageStudioSlotImageSrc(selectedSlot, productImagesExternalBaseUrl)
    : null;
  const canLoadToCanvas = Boolean(
    (temporaryObjectUpload && projectId) || (selectedSlot?.id && selectedSlotImageSrc)
  );
  const activeProjectNameFieldValue = useMemo((): string => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) return '';
    const rawProjects: unknown = projectsQuery.data;
    const projectList: unknown[] = Array.isArray(rawProjects) ? (rawProjects as unknown[]) : [];
    const activeProject = projectList.find((candidate): boolean => {
      if (!candidate || typeof candidate !== 'object') return false;
      const projectRecord = candidate as Record<string, unknown>;
      return projectRecord['id'] === normalizedProjectId;
    });
    if (!activeProject || typeof activeProject !== 'object') return normalizedProjectId;
    const activeProjectRecord = activeProject as Record<string, unknown>;
    const activeProjectNameRaw = activeProjectRecord['name'];
    const activeProjectName =
      typeof activeProjectNameRaw === 'string' ? activeProjectNameRaw.trim() : '';
    return activeProjectName || normalizedProjectId;
  }, [projectId, projectsQuery.data]);
  const visibleProjectNameFieldValue = projectRenameEditing
    ? projectNameDraft
    : activeProjectNameFieldValue;
  const docsTooltips = useMemo(
    () => ({
      selectCardFirst: getImageStudioDocTooltip('sidebar_select_card_first'),
      editCard: getImageStudioDocTooltip('sidebar_edit_card'),
      duplicateCard: getImageStudioDocTooltip('sidebar_duplicate_card'),
      loadToCanvas: getImageStudioDocTooltip('sidebar_load_to_canvas'),
      decanvas: getImageStudioDocTooltip('sidebar_decanvas'),
      newCard: getImageStudioDocTooltip('sidebar_new_card'),
      newFolder: getImageStudioDocTooltip('sidebar_new_folder'),
    }),
    []
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
        (await singleSlotManagerRef.current?.consumeTemporaryObjectUpload({
          loadToCanvas: true,
        })) ?? false;
      if (consumedTemporaryUpload) return;

      if (temporaryObjectUpload) {
        toast('Failed to load uploaded image onto canvas. Try uploading again.', {
          variant: 'error',
        });
        return;
      }

      if (selectedSlot?.id && selectedSlotImageSrc) {
        setPreviewMode('image');
        setWorkingSlotId(selectedSlot.id);
        return;
      }
      toast('Load to canvas is only available for Object slot upload or a card with an image.', {
        variant: 'info',
      });
    })().finally(() => {
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

  const queueRevealInTree = useCallback(
    (targetSlotId: string | null): void => {
      if (!targetSlotId) {
        toast('No card is currently loaded in the preview.', { variant: 'info' });
        return;
      }
      setSelectedSlotId(targetSlotId);
      setRevealRequest((prev) => ({
        slotId: targetSlotId,
        nonce: (prev?.nonce ?? 0) + 1,
      }));
    },
    [setSelectedSlotId, toast]
  );

  const handleCreateFolder = (): void => {
    const normalizePath = (value: string): string =>
      value
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');

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
      const parent = folderPath.includes('/')
        ? folderPath.slice(0, folderPath.lastIndexOf('/'))
        : '';
      if (parent !== selectedParent) return;
      const leaf = folderPath.includes('/')
        ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
        : folderPath;
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
      toast(error instanceof Error ? error.message : 'Failed to create folder', {
        variant: 'error',
      });
    });
  };

  const handleCreateCardFromLoadedImage = useCallback((): void => {
    void (async (): Promise<void> => {
      // Resolve target folder: card selected → card's folder, folder selected → that folder, else root
      const resolvedTargetFolder = selectedSlotId
        ? (selectedSlot?.folderPath?.trim() ?? '')
        : selectedFolder.trim();

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
    })().catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to create card.', {
        variant: 'error',
      });
    });
  }, [createSlots, queueRevealInTree, selectedFolder, selectedSlot, selectedSlotId, toast]);

  const handleDuplicateSelectedCard = useCallback((): void => {
    if (duplicateCardBusy) return;
    if (!projectId.trim()) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }
    if (!selectedSlot) {
      toast('Select a card to duplicate.', { variant: 'info' });
      return;
    }

    setDuplicateCardBusy(true);
    void (async (): Promise<void> => {
      const sourceName = selectedSlot.name?.trim() || selectedSlot.id;
      const sourceFolder = selectedSlot.folderPath?.trim() ?? '';
      const sourceImageUrl = selectedSlot.imageUrl?.trim() ?? '';
      const sourceImageBase64 = selectedSlot.imageBase64?.trim() ?? '';
      const sourceMetadata =
        selectedSlot.metadata &&
        typeof selectedSlot.metadata === 'object' &&
        !Array.isArray(selectedSlot.metadata)
          ? cloneSettingValue(selectedSlot.metadata)
          : null;

      const created = await createSlots([
        {
          name: sourceName ? `${sourceName} Copy` : `Card ${Date.now()}`,
          ...(sourceFolder ? { folderPath: sourceFolder } : {}),
          ...(selectedSlot.imageFileId ? { imageFileId: selectedSlot.imageFileId } : {}),
          ...(sourceImageUrl ? { imageUrl: sourceImageUrl } : {}),
          ...(sourceImageBase64 ? { imageBase64: sourceImageBase64 } : {}),
          ...(selectedSlot.asset3dId ? { asset3dId: selectedSlot.asset3dId } : {}),
          ...(selectedSlot.screenshotFileId
            ? { screenshotFileId: selectedSlot.screenshotFileId }
            : {}),
          ...(sourceMetadata ? { metadata: sourceMetadata } : {}),
        },
      ]);

      const duplicatedCard = created[0] ?? null;
      if (!duplicatedCard) {
        throw new Error('Failed to duplicate card.');
      }

      queueRevealInTree(duplicatedCard.id);
      toast('Card duplicated.', { variant: 'success' });
    })()
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : 'Failed to duplicate card.', {
          variant: 'error',
        });
      })
      .finally(() => {
        setDuplicateCardBusy(false);
      });
  }, [createSlots, duplicateCardBusy, projectId, queueRevealInTree, selectedSlot, toast]);

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
      const savedAt = new Date().toISOString();
      const sequenceSnapshot = buildImageStudioSequenceSnapshot(studioSettings, {
        modelId: generationModel.effectiveModelId,
      });
      const settingsPayload = {
        ...studioSettings,
        projectSequencing: {
          ...studioSettings.projectSequencing,
          snapshotHash: sequenceSnapshot.hash,
          snapshotSavedAt: savedAt,
          snapshotStepCount: sequenceSnapshot.stepCount,
          snapshotModelId: sequenceSnapshot.modelId,
        },
      };

      setStudioSettings(settingsPayload);
      await saveStudioSettings({
        silent: true,
        settingsOverride: settingsPayload,
      });

      let serializedSession: string;
      try {
        serializedSession = serializeImageStudioProjectSession(projectSession);
      } catch (error: unknown) {
        logClientError(error);
        throw new Error(
          error instanceof Error
            ? `Failed to serialize project session: ${error.message}`
            : 'Failed to serialize project session.',
          { cause: error }
        );
      }
      try {
        saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
      } catch (error) {
        logClientError(error);
      
        // Continue with cloud save; local cache is best-effort.
      }

      await updateSetting.mutateAsync({
        key: projectSessionKey,
        value: serializedSession,
      });

      toast(`Project "${normalizedProjectId}" saved.`, { variant: 'success' });
    })()
      .catch((error: unknown) => {
        try {
          saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
        } catch (error) {
          logClientError(error);
        
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

  const handleBeginProjectRename = useCallback((): void => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) return;
    setProjectNameDraft(activeProjectNameFieldValue || normalizedProjectId);
    setProjectRenameEditing(true);
  }, [activeProjectNameFieldValue, projectId]);

  const handleCancelProjectRename = useCallback((): void => {
    setProjectRenameEditing(false);
    setProjectNameDraft(activeProjectNameFieldValue);
  }, [activeProjectNameFieldValue]);

  const handleCommitProjectRename = useCallback((): void => {
    if (!projectRenameEditing) return;
    const sourceProjectId = projectId.trim();
    if (!sourceProjectId) {
      setProjectRenameEditing(false);
      return;
    }
    const nextProjectId = projectNameDraft.trim();
    if (!nextProjectId) {
      toast('Project name cannot be empty.', { variant: 'info' });
      setProjectNameDraft(activeProjectNameFieldValue || sourceProjectId);
      setProjectRenameEditing(false);
      return;
    }
    if (nextProjectId === sourceProjectId) {
      setProjectRenameEditing(false);
      return;
    }
    void handleRenameProject(sourceProjectId, nextProjectId)
      .then(() => {
        setProjectRenameEditing(false);
      })
      .catch(() => {
        setProjectRenameEditing(false);
        setProjectNameDraft(activeProjectNameFieldValue || sourceProjectId);
      });
  }, [
    activeProjectNameFieldValue,
    handleRenameProject,
    projectId,
    projectNameDraft,
    projectRenameEditing,
    toast,
  ]);

  useEffect(() => {
    setRevealRequest(null);
  }, [projectId]);

  useEffect(() => {
    if (projectRenameEditing) return;
    setProjectNameDraft(activeProjectNameFieldValue);
  }, [activeProjectNameFieldValue, projectRenameEditing]);

  useEffect(() => {
    if (!projectRenameEditing || typeof window === 'undefined') return;
    const raf = window.requestAnimationFrame(() => {
      projectNameInputRef.current?.focus();
      projectNameInputRef.current?.select();
    });
    return (): void => {
      window.cancelAnimationFrame(raf);
    };
  }, [projectRenameEditing]);

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
      width='100%'
      isFocusMode={isFocusMode}
      className='order-1 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40'
    >
      <div className='grid min-h-0 flex-1 grid-rows-[auto_auto_clamp(240px,38vh,420px)_minmax(160px,1fr)] gap-3 overflow-hidden p-4'>
        <div className='flex items-center gap-2 px-1 py-1' data-preserve-slot-selection='true'>
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-7 shrink-0 px-2 text-[11px]'
            title='Save current Image Studio project state'
            aria-label='Save current Image Studio project state'
            disabled={projectSaveBusy || !projectId.trim()}
            onClick={handleSaveProject}
            data-preserve-slot-selection='true'
          >
            {projectSaveBusy ? 'Saving...' : 'Save Project'}
          </Button>
          <Input
            ref={projectNameInputRef}
            size='sm'
            value={visibleProjectNameFieldValue}
            readOnly={!projectRenameEditing}
            placeholder='No active project'
            title={visibleProjectNameFieldValue || 'No active project'}
            className='h-7 min-w-0 flex-1 text-[11px]'
            onDoubleClick={handleBeginProjectRename}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              if (!projectRenameEditing) return;
              setProjectNameDraft(event.target.value);
            }}
            onBlur={handleCommitProjectRename}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCommitProjectRename();
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                handleCancelProjectRename();
              }
            }}
            data-preserve-slot-selection='true'
            aria-label='Active project name'
          />
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
            <Tooltip content={selectedSlot ? docsTooltips.editCard : docsTooltips.selectCardFirst}>
              <Button
                size='xs'
                type='button'
                variant='outline'
                title={selectedSlot ? docsTooltips.editCard : docsTooltips.selectCardFirst}
                onClick={() => setSlotInlineEditOpen(true)}
                disabled={!selectedSlot}
                aria-label='Edit card'
              >
                <Settings2 className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip
              content={selectedSlot ? docsTooltips.duplicateCard : docsTooltips.selectCardFirst}
            >
              <Button
                size='xs'
                type='button'
                variant='outline'
                title={selectedSlot ? docsTooltips.duplicateCard : docsTooltips.selectCardFirst}
                onClick={handleDuplicateSelectedCard}
                disabled={!selectedSlot || duplicateCardBusy}
                aria-label='Duplicate card'
              >
                <Copy className='size-4' />
              </Button>
            </Tooltip>
          </div>
          <div className='flex shrink-0 flex-col items-center gap-2 self-start'>
            <Tooltip content={docsTooltips.loadToCanvas}>
              <Button
                size='xs'
                type='button'
                variant='outline'
                title={docsTooltips.loadToCanvas}
                onClick={handleLoadToCanvas}
                disabled={loadToCanvasBusy || !canLoadToCanvas}
                aria-label='Load to canvas'
              >
                <ImagePlus className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content={docsTooltips.decanvas}>
              <Button
                size='xs'
                type='button'
                variant='outline'
                title={docsTooltips.decanvas}
                onClick={handleDeCanvas}
                disabled={!workingSlot}
                aria-label='De-canvas'
              >
                <ImageOff className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content={docsTooltips.newCard}>
              <Button
                size='xs'
                type='button'
                variant='outline'
                title={docsTooltips.newCard}
                onClick={handleCreateCardFromLoadedImage}
                disabled={!projectId}
                aria-label='New Card'
              >
                <Plus className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content={docsTooltips.newFolder}>
              <Button
                size='xs'
                type='button'
                variant='outline'
                title={docsTooltips.newFolder}
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
              <CompactEmptyState
                title='No shapes drawn yet'
                description='Use the mask tools above to draw polygons or lasso shapes on the canvas.'
                className='border-none bg-transparent py-4'
               />
            )}
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
