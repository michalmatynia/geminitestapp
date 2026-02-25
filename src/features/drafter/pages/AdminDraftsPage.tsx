'use client';

import React from 'react';

import { SectionHeader } from '@/shared/ui';

import { DraftCreatorModal } from '../components/DraftCreatorModal';
import { DraftList } from '../components/DraftList';
import { DrafterProvider, useDrafterContext } from '../context/DrafterContext';
import { useDraftQueries } from '../hooks/useDraftQueries';

function AdminDraftsPageContent(): React.JSX.Element {
  return (
    <div className='container mx-auto py-10'>
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
