'use client';

import React from 'react';
import {
  KangurButton,
  KangurHeadline,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import dynamic from 'next/dynamic';

const KangurChoiceDialog = dynamic(() =>
  import('@/features/kangur/ui/components/KangurChoiceDialog').then((m) => ({
    default: function KangurChoiceDialogEntry(
      props: import('@/features/kangur/ui/components/KangurChoiceDialog').KangurChoiceDialogProps
    ) {
      return m.renderKangurChoiceDialog(props);
    },
  }))
);

export function KangurAssignmentManagerTimeLimitModal({
  isOpen,
  onOpenChange,
  title,
  draftValue,
  onDraftChange,
  onSave,
  saveLabel,
  isDisabled,
  error,
  preview,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  draftValue: string;
  onDraftChange: (val: string) => void;
  onSave: () => void;
  saveLabel: string;
  isDisabled: boolean;
  error: string | null;
  preview: string;
}) {
  return (
    <KangurChoiceDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      showCloseButton
    >
      <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
        <KangurTextField
          label='Limit czasu (minuty)'
          value={draftValue}
          onChange={onDraftChange}
          placeholder='Brak limitu'
          error={error ?? undefined}
          autoFocus
        />
        <div className='flex items-center justify-between gap-4'>
          <p className='text-xs text-slate-500'>
            Obecny limit: <span className='font-bold text-slate-700'>{preview}</span>
          </p>
          <KangurButton
            onClick={onSave}
            disabled={isDisabled}
            size='sm'
            variant='primary'
          >
            {saveLabel}
          </KangurButton>
        </div>
      </div>
    </KangurChoiceDialog>
  );
}
