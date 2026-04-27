'use client';

import React, { startTransition } from 'react';

import { PersonAnyParamsSection } from '../components/page/PersonAnyParamsSection';
import { PersonAnyTextsSection } from '../components/page/PersonAnyTextsSection';
import { PersonBankAccountsSection } from '../components/page/PersonBankAccountsSection';
import { PersonBasicInfoSection } from '../components/page/PersonBasicInfoSection';
import { PersonContractsSection } from '../components/page/PersonContractsSection';
import { PersonDocumentsSection } from '../components/page/PersonDocumentsSection';
import { PersonEmailsSection } from '../components/page/PersonEmailsSection';
import { PersonWebsitesSection } from '../components/page/PersonWebsitesSection';
import { PersonOccupationsSection } from '../components/page/PersonOccupationsSection';
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
      {isCreateMode ? null : (
        <>
          <PersonBankAccountsSection />
          <PersonContractsSection />
          <PersonDocumentsSection />
          <PersonOccupationsSection />
          <PersonAnyTextsSection />
          <PersonAnyParamsSection />
          <PersonEmailsSection />
          <PersonWebsitesSection />
        </>
      )}
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
