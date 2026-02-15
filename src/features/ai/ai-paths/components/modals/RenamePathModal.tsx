'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { AppModal, Button, Input, Label } from '@/shared/ui';

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
  if (!isOpen) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title='Rename Path'
      size='sm'
      footer={
        <div className='flex w-full justify-end gap-2'>
          <Button
            type='button'
            className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type='button'
            className='rounded-md border text-sm text-white hover:bg-muted/60'
            onClick={onSave}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className='space-y-2'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Name</Label>
          <Input
            className='h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-white'
            value={draftName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDraftName(event.target.value)}
            placeholder='Path name'
            autoFocus
          />
        </div>
      </div>
    </AppModal>
  );
}
