'use client';

import React from 'react';
import { AppModal, Button } from '@/shared/ui';
import type { ModalStateProps } from '@/shared/types/modal-props';
import type { ImageStudioSlotRecord } from '../../types';

interface SlotInlineEditModalProps extends ModalStateProps {
  selectedSlot: ImageStudioSlotRecord | null;
  busy: boolean;
  onSave: () => Promise<void>;
  onCopyId: (id: string) => void;
  header: React.ReactNode;
  children: React.ReactNode;
}

export function SlotInlineEditModal({
  isOpen,
  onClose,
  selectedSlot,
  busy,
  onSave,
  onCopyId,
  header,
  children,
}: SlotInlineEditModalProps): React.JSX.Element | null {
  if (!isOpen || !selectedSlot) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={header}
      size='xl'
      footer={
        <Button
          size='xs'
          type='button'
          variant='outline'
          className='bg-card/90 font-mono text-[11px] text-gray-200 hover:text-white'
          onClick={() => onCopyId(selectedSlot.id)}
          title='Click to copy Card ID'
        >
          Card ID: {selectedSlot.id}
        </Button>
      }
    >
      {children}
    </AppModal>
  );
}
