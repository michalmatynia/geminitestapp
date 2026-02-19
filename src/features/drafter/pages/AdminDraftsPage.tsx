'use client';

import React from 'react';

import { SectionHeader } from '@/shared/ui';

import { DraftCreatorModal } from '../components/DraftCreatorModal';
import { DraftList } from '../components/DraftList';
import { DrafterProvider, useDrafterContext } from '../context/DrafterContext';

function AdminDraftsPageContent(): React.JSX.Element {
  const { 
    isCreatorOpen, 
    editingDraftId, 
    closeCreator, 
    formRef 
  } = useDrafterContext();

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Product Drafts'
        description='Create reusable templates for products with pre-filled values'
        className='mb-6'
      />

      <DraftList />

      <DraftCreatorModal
        isOpen={isCreatorOpen}
        onClose={closeCreator}
        onSuccess={() => {}}
        item={editingDraftId}
        formRef={formRef}
      />
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
