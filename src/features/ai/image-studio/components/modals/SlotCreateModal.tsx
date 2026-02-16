'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { Button } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

interface SlotCreateModalProps extends ModalStateProps {
  onSelectMode: (mode: 'empty' | 'image' | 'local') => void;
  disabled?: boolean;
}

export function SlotCreateModal({
  isOpen,
  onClose,
  onSelectMode,
  disabled = false,
}: SlotCreateModalProps): React.JSX.Element | null {
  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='New Card'
      size='sm'
      footer={null}
    >
      <div className='grid gap-3'>
        <Button 
          variant='secondary'
          onClick={() => { onSelectMode('empty'); onClose(); }}
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
          onClick={() => { onSelectMode('image'); onClose(); }}
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
          onClick={() => { onSelectMode('local'); onClose(); }}
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
