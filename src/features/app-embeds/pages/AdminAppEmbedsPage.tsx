'use client';

import React from 'react';

import { AppEmbedList } from '@/features/app-embeds/components/AppEmbedList';
import { AppEmbedsProvider, useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { Button } from '@/shared/ui/primitives.public';
import { SectionHeader, LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

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
    <div className='page-section max-w-5xl'>
      <SectionHeader
        title='App Embeds'
        description='Enable apps that can be mounted inside CMS pages and composed with CMS zoning.'
        className='mb-6'
      />

      <FormSection
        title='Enabled Embeds'
        actions={
          <Button
            onClick={() => {
              save().catch(() => {});
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
