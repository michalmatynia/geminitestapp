'use client';

import React, { useEffect, useState } from 'react';

import { FormModal, Button } from '@/shared/ui';

import type { ProductDraft } from '@/shared/contracts/products';
import { useDrafterContext } from '../context/DrafterContext';
import { useDraftQueries } from '../hooks/useDraftQueries';
import { DraftCreator } from './DraftCreator';

export function DraftCreatorModal(): React.JSX.Element | null {
  const {
    isCreatorOpen: isOpen,
    closeCreator: onClose,
    editingDraftId,
    formRef,
  } = useDrafterContext();

  const { data: drafts = [] } = useDraftQueries();
  const editingDraft = drafts.find((d: ProductDraft) => d.id === editingDraftId) ?? null;

  const [isDraftActive, setIsDraftActive] = useState<boolean>(true);

  useEffect((): void => {
    if (isOpen && !editingDraft) {
      setIsDraftActive(true);
    } else if (isOpen && editingDraft) {
      setIsDraftActive(editingDraft.active ?? true);
    }
  }, [isOpen, editingDraft]);

  if (!isOpen) return null;

  const title = editingDraft ? 'Edit Draft' : 'Create Draft';
  const submitText = editingDraft ? 'Update Draft' : 'Create Draft';

  const actions = (
    <div className='flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1 mr-2'>
      <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
        Quick Create
      </span>
      <Button
        type='button'
        variant={isDraftActive ? 'default' : 'outline'}
        size='xs'
        className={`h-6 min-w-12 text-[10px] font-bold ${
          isDraftActive
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30'
            : 'text-red-400 hover:bg-red-500/10 border-red-500/30'
        }`}
        onClick={(): void => setIsDraftActive((prev: boolean) => !prev)}
      >
        {isDraftActive ? 'ACTIVE' : 'OFF'}
      </Button>
    </div>
  );

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={title}
      size='xl'
      className='max-w-5xl'
      onSave={(): void => {
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }}
      saveText={submitText}
      actions={actions}
    >
      <DraftCreator
        active={isDraftActive}
        onActiveChange={(value: boolean): void => setIsDraftActive(value)}
      />
    </FormModal>
  );
}
