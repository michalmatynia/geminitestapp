'use client';

import React, { useEffect, useState } from 'react';

import { DraftCreator } from '@/features/drafter/components/DraftCreator';
import { useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { Button } from '@/shared/ui/primitives.public';
import { FormModal } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

import {
  DrafterProvider,
  useDrafterActions,
  useDrafterState,
} from '../context/DrafterContext';
import { DraftList } from './AdminDraftsPage.draft-list';

function DraftCreatorActions({
  active,
  onActiveChange,
}: {
  active: boolean;
  onActiveChange: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1 mr-2'>
      <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
        Quick Create
      </span>
      <Button
        type='button'
        variant={active ? 'default' : 'outline'}
        size='xs'
        className={`h-6 min-w-12 text-[10px] font-bold ${
          active
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30'
            : 'text-red-400 hover:bg-red-500/10 border-red-500/30'
        }`}
        onClick={(): void => onActiveChange(!active)}
      >
        {active ? 'ACTIVE' : 'OFF'}
      </Button>
    </div>
  );
}

function DraftCreatorModal(): React.JSX.Element | null {
  const { isCreatorOpen: isOpen, editingDraftId, formRef } = useDrafterState();
  const { closeCreator: onClose } = useDrafterActions();

  const { data: drafts = [] } = useDraftQueries();
  const editingDraft = drafts.find((d: ProductDraft) => d.id === editingDraftId) ?? null;

  const [isDraftActive, setIsDraftActive] = useState<boolean>(true);

  useEffect((): void => {
    if (isOpen !== true) return;
    setIsDraftActive(editingDraft?.active ?? true);
  }, [isOpen, editingDraft]);

  if (!isOpen) return null;

  const title = editingDraft !== null ? 'Edit Draft' : 'Create Draft';
  const submitText = editingDraft !== null ? 'Update Draft' : 'Create Draft';

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={title}
      size='xl'
      className='max-w-5xl'
      onSave={(): void => {
        if (formRef.current !== null) {
          formRef.current.requestSubmit();
        }
      }}
      saveText={submitText}
      actions={(
        <DraftCreatorActions
          active={isDraftActive}
          onActiveChange={setIsDraftActive}
        />
      )}
    >
      <DraftCreator
        active={isDraftActive}
        onActiveChange={(value: boolean): void => setIsDraftActive(value)}
      />
    </FormModal>
  );
}

function AdminDraftsPageContent(): React.JSX.Element {
  return (
    <div className='page-section'>
      <SectionHeader
        title='Product Drafts'
        description='Create reusable templates for products with pre-filled values'
        className='mb-6'
      />

      <DraftList />

      <DraftCreatorModal />
    </div>
  );
}

export function AdminDraftsPage(): React.JSX.Element {
  return (
    <DrafterProvider>
      <AdminDraftsPageContent />
    </DrafterProvider>
  );
}
