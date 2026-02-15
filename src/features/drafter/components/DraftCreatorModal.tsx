'use client';

import React, { useEffect, useState } from 'react';

import { AppModal, Button } from '@/shared/ui';
import type { ModalStateProps } from '@/shared/types/modal-props';

import { DraftCreator } from './DraftCreator';

interface DraftCreatorModalProps extends ModalStateProps {
  editingDraftId: string | null;
  formRef: React.RefObject<HTMLFormElement | null>;
}

export function DraftCreatorModal({
  isOpen,
  onClose,
  editingDraftId,
  formRef,
}: DraftCreatorModalProps): React.JSX.Element | null {
  const [isDraftActive, setIsDraftActive] = useState<boolean>(true);

  useEffect((): void => {
    if (isOpen && !editingDraftId) {
      setIsDraftActive(true);
    }
  }, [isOpen, editingDraftId]);

  const title = editingDraftId ? 'Edit Draft' : 'Create Draft';
  const submitText = editingDraftId ? 'Update' : 'Create';

  if (!isOpen) return null;

  const header = (
    <div className='flex items-center justify-between w-full'>
      <div className='flex items-center gap-4'>
        <Button
          onClick={(): void => {
            if (formRef.current) {
              formRef.current.requestSubmit();
            }
          }}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {submitText}
        </Button>
        <div className='flex items-center gap-3'>
          <h2 className='text-2xl font-bold text-white'>{title}</h2>
          <div className='flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-2 py-1'>
            <span className='text-xs text-gray-300'>Quick Create</span>
            <Button
              type='button'
              className={`h-7 min-w-[52px] rounded-md border px-2 text-[10px] font-semibold tracking-wide ${
                isDraftActive
                  ? 'border-emerald-700 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                  : 'border-red-700 bg-red-500/10 text-red-200 hover:bg-red-500/20'
              }`}
              onClick={(): void => setIsDraftActive((prev: boolean) => !prev)}
              aria-label='Toggle quick create button'
            >
              {isDraftActive ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>
      </div>
      <Button
        type='button'
        onClick={onClose}
        className='min-w-[100px] border border-white/20 hover:border-white/40'
      >
        Close
      </Button>
    </div>
  );

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={title}
      header={header}
      className='md:min-w-[63rem] max-w-[66rem]'
    >
      <DraftCreator
        active={isDraftActive}
        onActiveChange={(value: boolean): void => setIsDraftActive(value)}
      />
    </AppModal>
  );
}
