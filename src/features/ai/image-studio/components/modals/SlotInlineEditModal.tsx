'use client';

import { Copy } from 'lucide-react';
import React from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { Button } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

interface SlotInlineEditModalProps extends EntityModalProps<ImageStudioSlotRecord> {
  onCopyId: (id: string) => void;
  header: React.ReactNode;
  children: React.ReactNode;
}

export function SlotInlineEditModal(props: SlotInlineEditModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item: selectedSlot, onCopyId, header, children } = props;

  if (!selectedSlot) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={typeof header === 'string' ? header : 'Edit Card'}
      size='xl'
      footer={
        <Button
          size='sm'
          type='button'
          variant='ghost'
          className='font-mono text-[10px] text-muted-foreground hover:text-foreground gap-2'
          onClick={() => onCopyId(selectedSlot.id)}
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
