import React from 'react';

import { PersonBasicInfoSection } from '../components/page/PersonBasicInfoSection';
import { PersonEmailsSection } from '../components/page/PersonEmailsSection';
import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';
import {
  useAdminFilemakerPersonEditPageActionsContext,
  AdminFilemakerPersonEditPageProvider,
  useAdminFilemakerPersonEditPageStateContext,
} from '../context/AdminFilemakerPersonEditPageContext';

function AdminFilemakerPersonEditPageInner(): React.JSX.Element {
  const { person, updateSetting, router } = useAdminFilemakerPersonEditPageStateContext();
  const { handleSave } = useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerPartyEditPageLayout
      itemName={person ? `${person.firstName} ${person.lastName}` : null}
      notFoundMessage='Person not found.'
      parent={{ label: 'Persons', href: '/admin/filemaker/persons' }}
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
