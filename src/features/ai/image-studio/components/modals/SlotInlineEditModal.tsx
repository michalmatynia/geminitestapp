'use client';

import { Copy } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { DetailModal } from '@/shared/ui/templates/modals';

import { useStudioInlineEdit } from '../studio-modals/StudioInlineEditContext';

interface SlotInlineEditModalProps {
  children: React.ReactNode;
}

export function SlotInlineEditModal(props: SlotInlineEditModalProps): React.JSX.Element | null {
  const { children } = props;
  const { onCopyCardId, selectedSlot, setSlotInlineEditOpen, slotInlineEditOpen } =
    useStudioInlineEdit();

  if (!selectedSlot) return null;

  return (
    <DetailModal
      isOpen={slotInlineEditOpen}
      onClose={() => setSlotInlineEditOpen(false)}
      title='Edit Card'
      size='xl'
      footer={
        <Button
          size='sm'
          type='button'
          variant='ghost'
          className='font-mono text-[10px] text-muted-foreground hover:text-foreground gap-2'
          onClick={() => {
            void onCopyCardId(selectedSlot.id);
          }}
          title='Click to copy Card ID'
        >
          <Copy className='size-3' />
          ID: {selectedSlot.id}
        </Button>
      }
    >
      {children}
    </DetailModal>
  );
}
