'use client';

import { FolderPlus, ImageOff, ImagePlus, Plus, Settings2 } from 'lucide-react';
import React, { useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  FormModal,
  Input,
  Label,
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
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { useUiState } from '../context/UiContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';

export function LeftSidebar(): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { isFocusMode } = useUiState();
  const settingsStore = useSettingsStore();
  const { maskShapes } = useMaskingState();
  const { slots, selectedSlot, selectedFolder, workingSlot } = useSlotsState();
  const {
    setSlotCreateOpen,
    setSlotInlineEditOpen,
    setSelectedSlotId,
    setWorkingSlotId,
    setPreviewMode,
    createFolderMutation,
  } = useSlotsActions();
  const {
    setMaskShapes,
    setActiveMaskId,
    setSelectedPointIndex,
  } = useMaskingActions();

  const { toast } = useToast();
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const singleSlotManagerRef = useRef<ImageStudioSingleSlotManagerHandle | null>(null);
  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const handleLoadToCanvas = (): void => {
    void (async (): Promise<void> => {
      const consumedTemporaryUpload =
        (await singleSlotManagerRef.current?.consumeTemporaryObjectUpload({ loadToCanvas: true })) ?? false;
      if (consumedTemporaryUpload) return;

      if (selectedSlot?.id) {
        setPreviewMode('image');
        setWorkingSlotId(selectedSlot.id);
        if (!getImageStudioSlotImageSrc(selectedSlot, productImagesExternalBaseUrl)) {
          toast('Selected card has no image source yet.', { variant: 'info' });
        }
        return;
      }
      const normalizedFolder = selectedFolder.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      const slotFromSelectedFolder = normalizedFolder
        ? slots.find((slot) => (slot.folderPath ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === normalizedFolder) ?? null
        : null;
      const slotWithImage =
        slots.find((slot) => Boolean(getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl))) ?? null;
      const fallbackSlot = slotFromSelectedFolder ?? slotWithImage ?? slots[0] ?? null;
      if (fallbackSlot) {
        setSelectedSlotId(fallbackSlot.id);
        setPreviewMode('image');
        setWorkingSlotId(fallbackSlot.id);
        if (!getImageStudioSlotImageSrc(fallbackSlot, productImagesExternalBaseUrl)) {
          toast('Selected card has no image source yet.', { variant: 'info' });
        }
        return;
      }
      setSlotCreateOpen(true);
    })();
  };

  const handleDeCanvas = (): void => {
    setWorkingSlotId(null);
    setMaskShapes([]);
    setActiveMaskId(null);
    setSelectedPointIndex(null);
  };

  const handleCreateFolder = (): void => {
    const normalized = folderDraft.trim();
    if (!normalized) return;
    void createFolderMutation.mutateAsync(normalized).then(() => {
      setFolderCreateOpen(false);
      setFolderDraft('');
    }).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to create folder', { variant: 'error' });
    });
  };

  return (
    <>
      <SectionPanel
        className={cn(
          'order-1 flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out p-0',
          isFocusMode && 'pointer-events-none opacity-0 -translate-x-2'
        )}
        variant='subtle'
        aria-hidden={isFocusMode}
      >
        <div className='flex min-h-0 flex-1 flex-col gap-3 p-4'>
          <div className='rounded border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-400'>
            {selectedSlot
              ? `Active card: ${selectedSlot.name || selectedSlot.id}`
              : 'No active card selected. Pick a card from the tree.'}
          </div>

          <ImageStudioSingleSlotManager ref={singleSlotManagerRef} />

          <div className='flex items-center justify-end gap-2' data-preserve-slot-selection='true'>
            <Tooltip content='Load to canvas'>
              <Button
                type='button'
                size='icon'
                variant='outline'
                title='Load to canvas'
                onClick={handleLoadToCanvas}
                disabled={!projectId}
                aria-label='Load to canvas'
              >
                <ImagePlus className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content='De-canvas'>
              <Button
                type='button'
                size='icon'
                variant='outline'
                title='De-canvas'
                onClick={handleDeCanvas}
                disabled={!workingSlot}
                aria-label='De-canvas'
              >
                <ImageOff className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content='New card'>
              <Button
                type='button'
                size='icon'
                variant='outline'
                title='New card'
                onClick={() => {
                  void (async (): Promise<void> => {
                    const consumedTemporaryUpload =
                      (await singleSlotManagerRef.current?.consumeTemporaryObjectUpload({ loadToCanvas: false })) ?? false;
                    if (consumedTemporaryUpload) return;
                    setSlotCreateOpen(true);
                  })();
                }}
                disabled={!projectId}
                aria-label='New card'
              >
                <Plus className='size-4' />
              </Button>
            </Tooltip>
            <Tooltip content='New folder'>
              <Button
                type='button'
                size='icon'
                variant='outline'
                title='New folder'
                onClick={() => {
                  setFolderDraft(selectedFolder || '');
                  setFolderCreateOpen(true);
                }}
                disabled={!projectId || createFolderMutation.isPending}
                aria-label='New folder'
              >
                <FolderPlus className='size-4' />
              </Button>
            </Tooltip>
            {selectedSlot ? (
              <Tooltip content='Edit card'>
                <Button
                  type='button'
                  size='icon'
                  variant='outline'
                  title='Edit card'
                  onClick={() => setSlotInlineEditOpen(true)}
                  aria-label='Edit card'
                >
                  <Settings2 className='size-4' />
                </Button>
              </Tooltip>
            ) : null}
          </div>

          <div className='h-1/2 min-h-[220px] overflow-hidden'>
            <SlotTree key={projectId} />
          </div>

          <div className='min-h-0 flex-1 overflow-hidden rounded border border-border/60 bg-card/40 p-2'>
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

      <FormModal
        open={folderCreateOpen}
        onClose={() => setFolderCreateOpen(false)}
        title='Create Folder'
        onSave={handleCreateFolder}
        isSaving={createFolderMutation.isPending}
        saveText='Create Folder'
        cancelText='Cancel'
        size='md'
      >
        <div className='space-y-3'>
          <Label className='text-xs text-gray-400'>Folder Path</Label>
          <Input
            value={folderDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFolderDraft(event.target.value)}
            placeholder='e.g. variants/red'
            className='h-9'
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreateFolder();
              }
            }}
          />
        </div>
      </FormModal>
    </>
  );
}
