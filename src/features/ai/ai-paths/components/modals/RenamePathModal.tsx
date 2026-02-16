'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { FormModal, Input, Label } from '@/shared/ui';

interface RenamePathModalProps extends ModalStateProps {
  draftName: string;
  setDraftName: (value: string) => void;
  onSave: () => void;
}

export function RenamePathModal({
  isOpen,
  onClose,
  draftName,
  setDraftName,
  onSave,
}: RenamePathModalProps): React.JSX.Element | null {
  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Rename Path'
      size='sm'
      onSave={onSave}
    >
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label className='text-xs text-muted-foreground'>Path Name</Label>
          <Input
            value={draftName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDraftName(event.target.value)}
            placeholder='e.g. My Automation Path'
            autoFocus
          />
        </div>
      </div>
    </FormModal>
  );
}
