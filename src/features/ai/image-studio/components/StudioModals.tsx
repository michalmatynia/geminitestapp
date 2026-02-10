'use client';

import React from 'react';

import FileManager from '@/features/files/components/FileManager';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { Button, SharedModal, useToast } from '@/shared/ui';

import { useImageStudio } from '../context/ImageStudioContext';

export function StudioModals(): React.JSX.Element {
  const { toast } = useToast();
  const {
    driveImportOpen,
    setDriveImportOpen,
    importFromDriveMutation,
    selectedFolder,
    slotCreateOpen,
    setSlotCreateOpen,
    createSlots,
    projectId,
    slots,
    setSelectedSlotId,
  } = useImageStudio();

  const handleDriveSelection = async (files: ImageFileSelection[]) => {
    setDriveImportOpen(false);
    if (files.length === 0) return;
    try {
      await importFromDriveMutation.mutateAsync({ files, folder: selectedFolder });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Import failed', { variant: 'error' });
    }
  };

  const handleCreateEmptySlot = async () => {
    setSlotCreateOpen(false);
    try {
      const created = await createSlots([{ name: `Slot ${slots.length + 1}`, folderPath: selectedFolder || null }]);
      if (created?.length > 0 && created[0]) setSelectedSlotId(created[0].id);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create slot', { variant: 'error' });
    }
  };

  return (
    <>
      <SharedModal
        open={driveImportOpen}
        onClose={() => setDriveImportOpen(false)}
        title='Import from Drive'
        size='xl'
      >
        <FileManager
          mode='select'
          selectionMode='multiple'
          onSelectFile={(files) => { handleDriveSelection(files).catch(() => {}); }}
        />
      </SharedModal>

      <SharedModal
        open={slotCreateOpen}
        onClose={() => setSlotCreateOpen(false)}
        title='New slot'
        size='md'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <div className='grid gap-2'>
            <Button variant='outline' onClick={() => { handleCreateEmptySlot().catch(() => {}); }} disabled={!projectId}>
              Create empty slot
            </Button>
          </div>
        </div>
      </SharedModal>
    </>
  );
}
