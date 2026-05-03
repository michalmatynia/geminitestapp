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

const resolveOrganizationPageItemName = ({
  isCreateMode,
  isPageLoading,
  organizationName,
}: {
  isCreateMode: boolean;
  isPageLoading: boolean;
  organizationName: string | null;
}): string | null => {
  if (isCreateMode) return 'Create Organization';
  return organizationName ?? (isPageLoading ? 'Loading...' : null);
};

function OrganizationEditTabs({ isCreateMode }: { isCreateMode: boolean }): React.JSX.Element {
  const { organization } = useAdminFilemakerOrganizationEditPageStateContext();
  const organizationId = organization?.id ?? '';
  const jobListingsHref =
    organizationId.length > 0
      ? `/admin/filemaker/organizations/${encodeURIComponent(organizationId)}/job-listings`
      : null;

  return (
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
          {jobListingsHref !== null ? (
            <div className='flex justify-end'>
              <a
                href={jobListingsHref}
                className='inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-3 text-xs text-gray-300 hover:bg-white/5'
              >
                Open full job listings page
              </a>
            </div>
          ) : null}
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
  );
}

function AdminFilemakerOrganizationEditPageInner(): React.JSX.Element {
  const { isCreateMode, isLoading, organization, updateSetting, router } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const { handleSave } = useAdminFilemakerOrganizationEditPageActionsContext();
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const isPageLoading = !hasMounted || isLoading;
  const itemName = resolveOrganizationPageItemName({
    isCreateMode,
    isPageLoading,
    organizationName: organization?.name ?? null,
  });

  return (
    <FilemakerPartyEditPageLayout
      itemName={itemName}
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
      {isPageLoading ? null : <OrganizationEditTabs isCreateMode={isCreateMode} />}
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
