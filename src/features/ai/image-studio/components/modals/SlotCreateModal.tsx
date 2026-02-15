'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { AppModal, Button } from '@/shared/ui';

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
  if (!isOpen) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title='New Card'
      size='md'
    >
      <div className='space-y-4 text-sm text-gray-200'>
        <Button 
          size='xs'
          variant='outline'
          onClick={() => onSelectMode('empty')}
          disabled={disabled}
          className='w-full'
        >
          Create Empty Card
        </Button>
        <Button 
          size='xs'
          onClick={() => onSelectMode('image')}
          disabled={disabled}
          className='w-full'
        >
          Create Card From Image
        </Button>
        <Button 
          size='xs'
          variant='outline'
          onClick={() => onSelectMode('local')}
          disabled={disabled}
          className='w-full'
        >
          Upload Local Image
        </Button>
      </div>
    </AppModal>
  );
}
