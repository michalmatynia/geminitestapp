'use client';

import { FolderPlus, ImageOff, ImagePlus, Plus, Settings2 } from 'lucide-react';
import React, { useState } from 'react';

import {
  Button,
  FormModal,
  Input,
  Label,
  SectionPanel,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ImageStudioSingleSlotManager } from './ImageStudioSingleSlotManager';
import { SlotTree } from './SlotTree';
import { useMaskingActions } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';

interface LeftSidebarProps {
  isFocusMode: boolean;
}

export function LeftSidebar({ isFocusMode }: LeftSidebarProps): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { slots, selectedSlot, selectedFolder } = useSlotsState();
  const {
    setSlotCreateOpen,
    setSlotInlineEditOpen,
    setSelectedSlotId,
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

  const handleLoadToCanvas = (): void => {
    if (selectedSlot?.id) {
      setSelectedSlotId(selectedSlot.id);
      return;
    }
    const normalizedFolder = selectedFolder.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const slotFromSelectedFolder = normalizedFolder
      ? slots.find((slot) => (slot.folderPath ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === normalizedFolder) ?? null
      : null;
    const fallbackSlot = slotFromSelectedFolder ?? slots[0] ?? null;
    if (fallbackSlot) {
      setSelectedSlotId(fallbackSlot.id);
      return;
    }
    setSlotCreateOpen(true);
  };

  const handleDeCanvas = (): void => {
    setSelectedSlotId(null);
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
              ? `Active slot: ${selectedSlot.name || selectedSlot.id}`
              : 'No active slot selected. Pick a slot file from the tree.'}
          </div>

          <ImageStudioSingleSlotManager />

          <div className='flex items-center justify-end gap-2'>
            <Button
              type='button'
              size='icon'
              variant='outline'
              title='Load to canvas'
              onClick={handleLoadToCanvas}
              disabled={!projectId}
            >
              <ImagePlus className='size-4' />
            </Button>
            <Button
              type='button'
              size='icon'
              variant='outline'
              title='De-canvas'
              onClick={handleDeCanvas}
              disabled={!selectedSlot}
            >
              <ImageOff className='size-4' />
            </Button>
            <Button
              type='button'
              size='icon'
              variant='outline'
              title='New slot'
              onClick={() => setSlotCreateOpen(true)}
              disabled={!projectId}
            >
              <Plus className='size-4' />
            </Button>
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
            >
              <FolderPlus className='size-4' />
            </Button>
            {selectedSlot ? (
              <Button
                type='button'
                size='icon'
                variant='outline'
                title='Edit slot'
                onClick={() => setSlotInlineEditOpen(true)}
              >
                <Settings2 className='size-4' />
              </Button>
            ) : null}
          </div>

          <div className='flex-1 overflow-hidden'>
            <SlotTree key={projectId} />
          </div>
        </div>
      </SectionPanel>

      <FormModal
        isOpen={folderCreateOpen}
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
