'use client';

import React, { startTransition } from 'react';

import { PersonAnyParamsSection } from '../components/page/PersonAnyParamsSection';
import { PersonAnyTextsSection } from '../components/page/PersonAnyTextsSection';
import { PersonBankAccountsSection } from '../components/page/PersonBankAccountsSection';
import { PersonBasicInfoSection } from '../components/page/PersonBasicInfoSection';
import { PersonAddressesSection } from '../components/page/PersonAddressesSection';
import { PersonContractsSection } from '../components/page/PersonContractsSection';
import { PersonCvsSection } from '../components/page/PersonCvsSection';
import { PersonDocumentsSection } from '../components/page/PersonDocumentsSection';
import { PersonEmailsSection } from '../components/page/PersonEmailsSection';
import { PersonWebsitesSection } from '../components/page/PersonWebsitesSection';
import { PersonOccupationsSection } from '../components/page/PersonOccupationsSection';
import { PersonProfileCvSection } from '../components/page/PersonProfileCvSection';
import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';
import {
  useAdminFilemakerPersonEditPageActionsContext,
  AdminFilemakerPersonEditPageProvider,
  useAdminFilemakerPersonEditPageStateContext,
} from '../context/AdminFilemakerPersonEditPageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';

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
      fullWidth
      pageTitle='Person Page'
      notFoundMessage='Person not found.'
      parent={{ label: 'Persons', href: '/admin/filemaker/persons' }}
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => startTransition(() => { router.push('/admin/filemaker/persons'); })}
      isSaving={updateSetting.isPending}
    >
      <Tabs defaultValue='details' className='w-full space-y-4'>
        <TabsList className='bg-card/40' aria-label='Person page tabs'>
          <TabsTrigger value='details'>Person Details</TabsTrigger>
          <TabsTrigger value='cv-profile'>CV Profile</TabsTrigger>
          {!isCreateMode ? <TabsTrigger value='linked-records'>Linked Records</TabsTrigger> : null}
        </TabsList>
        <TabsContent value='details' className='m-0 space-y-4 outline-none'>
          <PersonBasicInfoSection />
          <PersonAddressesSection />
        </TabsContent>
        <TabsContent value='cv-profile' className='m-0 space-y-4 outline-none'>
          <PersonProfileCvSection />
          {isCreateMode ? null : <PersonCvsSection />}
        </TabsContent>
        {!isCreateMode ? (
          <TabsContent value='linked-records' className='m-0 space-y-4 outline-none'>
            <PersonBankAccountsSection />
            <PersonDocumentsSection />
            <PersonOccupationsSection />
            <PersonAnyTextsSection />
            <PersonAnyParamsSection />
            <PersonEmailsSection />
            <PersonWebsitesSection />
            <PersonContractsSection />
          </TabsContent>
        ) : null}
      </Tabs>
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
