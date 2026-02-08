'use client';

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
        <h2 className='text-2xl font-bold text-white'>{title}</h2>
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
      >
        <DraftCreator />
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