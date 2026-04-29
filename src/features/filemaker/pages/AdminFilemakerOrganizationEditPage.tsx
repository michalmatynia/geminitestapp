'use client';

import React, { startTransition } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';

import { OrganizationAnyParamsSection } from '../components/page/OrganizationAnyParamsSection';
import { OrganizationAnyTextsSection } from '../components/page/OrganizationAnyTextsSection';
import { OrganizationAddressesSection } from '../components/page/OrganizationAddressesSection';
import { OrganizationBankAccountsSection } from '../components/page/OrganizationBankAccountsSection';
import { OrganizationBasicInfoSection } from '../components/page/OrganizationBasicInfoSection';
import { OrganizationCampaignDeliveriesSection } from '../components/page/OrganizationCampaignDeliveriesSection';
import { OrganizationContactLogsSection } from '../components/page/OrganizationContactLogsSection';
import { OrganizationDocumentsSection } from '../components/page/OrganizationDocumentsSection';
import { OrganizationEmailLogSection } from '../components/page/OrganizationEmailLogSection';
import { OrganizationEmailsSection } from '../components/page/OrganizationEmailsSection';
import { OrganizationEventsSection } from '../components/page/OrganizationEventsSection';
import { OrganizationImportedMetadataSection } from '../components/page/OrganizationImportedMetadataSection';
import { OrganizationJobListingsSection } from '../components/page/OrganizationJobListingsSection';
import { OrganizationLegacyDemandSection } from '../components/page/OrganizationLegacyDemandSection';
import { OrganizationLegacyMetadataSection } from '../components/page/OrganizationLegacyMetadataSection';
import { OrganizationMongoSummarySection } from '../components/page/OrganizationMongoSummarySection';
import { OrganizationPersonsSection } from '../components/page/OrganizationPersonsSection';
import { OrganizationWebsitesSection } from '../components/page/OrganizationWebsitesSection';
import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';
import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  AdminFilemakerOrganizationEditPageProvider,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../context/AdminFilemakerOrganizationEditPageContext';

function AdminFilemakerOrganizationEditPageInner(): React.JSX.Element {
  const { isCreateMode, isLoading, organization, updateSetting, router } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const { handleSave } = useAdminFilemakerOrganizationEditPageActionsContext();
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const isPageLoading = !hasMounted || isLoading;

  return (
    <FilemakerPartyEditPageLayout
      itemName={
        isCreateMode
          ? 'Create Organization'
          : (organization?.name ?? (isPageLoading ? 'Loading...' : null))
      }
      fullWidth
      pageTitle='Organization Page'
      notFoundMessage='Organization not found.'
      parent={{ label: 'Organizations', href: '/admin/filemaker/organizations' }}
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => startTransition(() => { router.push('/admin/filemaker/organizations'); })}
      isSaving={updateSetting.isPending}
    >
      {isPageLoading ? null : (
        <Tabs defaultValue='details' className='w-full space-y-4'>
          <TabsList className='bg-card/40' aria-label='Organization page tabs'>
            <TabsTrigger value='details'>Organization Details</TabsTrigger>
            {!isCreateMode ? <TabsTrigger value='job-listings'>Job Listings</TabsTrigger> : null}
            {!isCreateMode ? <TabsTrigger value='linked-records'>Linked Records</TabsTrigger> : null}
            {!isCreateMode ? <TabsTrigger value='activity'>Metadata & Activity</TabsTrigger> : null}
          </TabsList>
          <TabsContent value='details' className='m-0 space-y-4 outline-none'>
            <OrganizationBasicInfoSection />
            <OrganizationAddressesSection />
          </TabsContent>
          {!isCreateMode ? (
            <TabsContent value='job-listings' className='m-0 space-y-4 outline-none'>
              <OrganizationLegacyDemandSection />
              <OrganizationJobListingsSection />
            </TabsContent>
          ) : null}
          {!isCreateMode ? (
            <TabsContent value='linked-records' className='m-0 space-y-4 outline-none'>
              <OrganizationBankAccountsSection />
              <OrganizationDocumentsSection />
              <OrganizationPersonsSection />
              <OrganizationEventsSection />
              <OrganizationAnyTextsSection />
              <OrganizationAnyParamsSection />
              <OrganizationEmailsSection />
              <OrganizationWebsitesSection />
            </TabsContent>
          ) : null}
          {!isCreateMode ? (
            <TabsContent value='activity' className='m-0 space-y-4 outline-none'>
              <OrganizationLegacyMetadataSection />
              <OrganizationMongoSummarySection />
              <OrganizationImportedMetadataSection />
              <OrganizationContactLogsSection />
              <OrganizationEmailLogSection />
              <OrganizationCampaignDeliveriesSection />
            </TabsContent>
          ) : null}
        </Tabs>
      )}
      {/* More sections will be added here */}
    </FilemakerPartyEditPageLayout>
  );
}

export function AdminFilemakerOrganizationEditPage(): React.JSX.Element {
  return (
    <AdminFilemakerOrganizationEditPageProvider>
      <AdminFilemakerOrganizationEditPageInner />
    </AdminFilemakerOrganizationEditPageProvider>
  );
}
