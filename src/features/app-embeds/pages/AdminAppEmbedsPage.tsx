'use client';

import React from 'react';

import { AppEmbedList } from '@/features/app-embeds/components/AppEmbedList';
import { AppEmbedsProvider, useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { Button, SectionHeader, SectionPanel } from '@/shared/ui';

export function AdminAppEmbedsPage(): React.ReactNode {
  return (
    <AppEmbedsProvider>
      <AdminAppEmbedsContent />
    </AppEmbedsProvider>
  );
}

function AdminAppEmbedsContent(): React.ReactNode {
  const { isLoading, isSaving, save } = useAppEmbeds();

  if (isLoading) {
    return (
      <div className='container mx-auto py-10 text-gray-400'>
        Loading app embed settings...
      </div>
    );
  }

  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='App Embeds'
        description='Enable internal apps that can be embedded into CMS pages.'
        className='mb-6'
      />

      <SectionPanel className='p-6'>
        <AppEmbedList />

        <div className='mt-6 flex justify-end'>
          <Button
            onClick={() => { void save(); }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </SectionPanel>
    </div>
  );
}