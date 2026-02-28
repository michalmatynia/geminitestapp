'use client';

import React from 'react';
import { Breadcrumbs, FormActions } from '@/shared/ui';
import {
  AdminFilemakerPersonEditPageProvider,
  useAdminFilemakerPersonEditPageContext,
} from '../context/AdminFilemakerPersonEditPageContext';
import { PersonBasicInfoSection } from '../components/page/PersonBasicInfoSection';
import { PersonEmailsSection } from '../components/page/PersonEmailsSection';

function AdminFilemakerPersonEditPageInner(): React.JSX.Element {
  const { person, handleSave, updateSetting, router } = useAdminFilemakerPersonEditPageContext();

  if (!person) {
    return (
      <div className='container mx-auto py-8 text-center text-gray-500'>Person not found.</div>
    );
  }

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Breadcrumbs
          items={[
            { label: 'Filemaker', href: '/admin/filemaker' },
            { label: `${person.firstName} ${person.lastName}` },
          ]}
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <PersonBasicInfoSection />
          <PersonEmailsSection />

          {/* More sections will be added here */}
        </div>

        <div className='space-y-6'>{/* Sidebar sections will be added here */}</div>
      </div>

      <FormActions
        onSave={() => void handleSave()}
        onCancel={() => router.push('/admin/filemaker')}
        isSaving={updateSetting.isPending}
      />
    </div>
  );
}

export function AdminFilemakerPersonEditPage(): React.JSX.Element {
  return (
    <AdminFilemakerPersonEditPageProvider>
      <AdminFilemakerPersonEditPageInner />
    </AdminFilemakerPersonEditPageProvider>
  );
}
