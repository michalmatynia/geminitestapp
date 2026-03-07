'use client';

import React from 'react';

import { Button } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

import { useStudioImportContext } from '../studio-modals/StudioImportContext';

export function SlotCreateModal(): React.JSX.Element | null {
  const {
    handleCreateEmptySlot,
    projectId,
    setDriveImportMode,
    setDriveImportOpen,
    setDriveImportTargetId,
    setSlotCreateOpen,
    slotCreateOpen,
    triggerLocalUpload,
  } = useStudioImportContext();

  const disabled = !projectId;

  const onClose = React.useCallback((): void => {
    setSlotCreateOpen(false);
  }, [setSlotCreateOpen]);

  return (
    <DetailModal isOpen={slotCreateOpen} onClose={onClose} title='New Card' size='sm' footer={null}>
      <div className='grid gap-3'>
        <Button
          variant='secondary'
          onClick={() => {
            void handleCreateEmptySlot();
            onClose();
          }}
          disabled={disabled}
          className='w-full h-12 justify-start px-4 text-sm'
        >
          <div className='flex flex-col items-start'>
            <span className='font-semibold'>Create Empty Card</span>
            <span className='text-[10px] opacity-70'>Initialize a blank card slot</span>
          </div>
        </Button>
        <Button
          variant='primary'
          onClick={() => {
            setSlotCreateOpen(false);
            setDriveImportMode('create');
            setDriveImportTargetId(null);
            setDriveImportOpen(true);
          }}
          disabled={disabled}
          className='w-full h-12 justify-start px-4 text-sm'
        >
          <div className='flex flex-col items-start'>
            <span className='font-semibold'>Create Card From Image</span>
            <span className='text-[10px] opacity-90'>Use an existing preview image</span>
          </div>
        </Button>
        <Button
          variant='outline'
          onClick={() => {
            setSlotCreateOpen(false);
            triggerLocalUpload('create', null);
          }}
          disabled={disabled}
          className='w-full h-12 justify-start px-4 text-sm'
        >
          <div className='flex flex-col items-start'>
            <span className='font-semibold'>Upload Local Image</span>
            <span className='text-[10px] opacity-70'>Choose a file from your device</span>
          </div>
        </Button>
      </div>
    </DetailModal>
  );
}
