'use client';

import React from 'react';

import { AppEmbedList } from '@/features/app-embeds/components/AppEmbedList';
import { AppEmbedsProvider, useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { Button, SectionHeader, FormSection, LoadingState } from '@/shared/ui';

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
      <div className='flex min-h-[400px] items-center justify-center'>
        <LoadingState message='Loading app embed settings...' />
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

      <FormSection
        title='Enabled Embeds'
        actions={
          <Button
            onClick={() => {
              void save();
            }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        }
        className='p-6'
      >
        <AppEmbedList />
      </FormSection>
    </div>
  );
}
