'use client';

import React, { startTransition } from 'react';

import { PersonBasicInfoSection } from '../components/page/PersonBasicInfoSection';
import { PersonEmailsSection } from '../components/page/PersonEmailsSection';
import { PersonWebsitesSection } from '../components/page/PersonWebsitesSection';
import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';
import {
  useAdminFilemakerPersonEditPageActionsContext,
  AdminFilemakerPersonEditPageProvider,
  useAdminFilemakerPersonEditPageStateContext,
} from '../context/AdminFilemakerPersonEditPageContext';

const resolvePersonEditPageItemName = (
  isCreateMode: boolean,
  person: { firstName: string; lastName: string } | null
): string | null => {
  if (isCreateMode) return 'Create Person';
  if (person === null) return null;
  return `${person.firstName} ${person.lastName}`;
};

function AdminFilemakerPersonEditPageInner(): React.JSX.Element {
  const { isCreateMode, person, updateSetting, router } =
    useAdminFilemakerPersonEditPageStateContext();
  const { handleSave } = useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerPartyEditPageLayout
      itemName={resolvePersonEditPageItemName(isCreateMode, person)}
      notFoundMessage='Person not found.'
      parent={{ label: 'Persons', href: '/admin/filemaker/persons' }}
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => startTransition(() => { router.push('/admin/filemaker/persons'); })}
      isSaving={updateSetting.isPending}
    >
      <PersonBasicInfoSection />
      {isCreateMode ? null : <PersonEmailsSection />}
      {isCreateMode ? null : <PersonWebsitesSection />}
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
