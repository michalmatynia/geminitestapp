'use client';

import { useEffect, useState } from 'react';

import { AppModal, Button, SectionHeader } from '@/shared/ui';

import { DraftCreator } from '../components/DraftCreator';
import { DraftList } from '../components/DraftList';
import { DrafterProvider, useDrafterContext } from '../context/DrafterContext';

function AdminDraftsPageContent(): React.JSX.Element {
  const { 
    isCreatorOpen, 
    editingDraftId, 
    closeCreator, 
    formRef 
  } = useDrafterContext();
  const [isDraftActive, setIsDraftActive] = useState<boolean>(true);

  useEffect((): void => {
    if (isCreatorOpen && !editingDraftId) {
      setIsDraftActive(true);
    }
  }, [isCreatorOpen, editingDraftId]);

  const title = editingDraftId ? 'Edit Draft' : 'Create Draft';
  const submitText = editingDraftId ? 'Update' : 'Create';

  const header = (
    <div className='flex items-center justify-between'>
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
        onClick={closeCreator}
        className='min-w-[100px] border border-white/20 hover:border-white/40'
      >
        Close
      </Button>
    </div>
  );

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Product Drafts'
        description='Create reusable templates for products with pre-filled values'
        className='mb-6'
      />

      <DraftList />

      <AppModal
        open={isCreatorOpen}
        onClose={closeCreator}
        title={title}
        header={header}
        className='md:min-w-[52rem] max-w-[55rem]'
      >
        <DraftCreator
          active={isDraftActive}
          onActiveChange={(value: boolean): void => setIsDraftActive(value)}
        />
      </AppModal>
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
