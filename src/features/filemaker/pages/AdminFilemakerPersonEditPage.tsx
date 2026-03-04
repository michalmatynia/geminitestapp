'use client';

import React from 'react';

import {
  AdminFilemakerPersonEditPageProvider,
  useAdminFilemakerPersonEditPageContext,
} from '../context/AdminFilemakerPersonEditPageContext';
import { PersonBasicInfoSection } from '../components/page/PersonBasicInfoSection';
import { PersonEmailsSection } from '../components/page/PersonEmailsSection';
import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';

function AdminFilemakerPersonEditPageInner(): React.JSX.Element {
  const { person, handleSave, updateSetting, router } = useAdminFilemakerPersonEditPageContext();

  return (
    <FilemakerPartyEditPageLayout
      itemName={person ? `${person.firstName} ${person.lastName}` : null}
      notFoundMessage='Person not found.'
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => router.push('/admin/filemaker')}
      isSaving={updateSetting.isPending}
    >
      <PersonBasicInfoSection />
      <PersonEmailsSection />
      {/* More sections will be added here */}
    </FilemakerPartyEditPageLayout>
  );
}

export function AdminFilemakerPersonEditPage(): React.JSX.Element {
  return (
    <AdminFilemakerPersonEditPageProvider>
      <AdminFilemakerPersonEditPageInner />
    </AdminFilemakerPersonEditPageProvider>
  );
}
