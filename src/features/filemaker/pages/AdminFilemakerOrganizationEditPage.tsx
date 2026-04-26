'use client';

import React, { startTransition } from 'react';

import { OrganizationAddressesSection } from '../components/page/OrganizationAddressesSection';
import { OrganizationBasicInfoSection } from '../components/page/OrganizationBasicInfoSection';
import { OrganizationCampaignDeliveriesSection } from '../components/page/OrganizationCampaignDeliveriesSection';
import { OrganizationContactLogsSection } from '../components/page/OrganizationContactLogsSection';
import { OrganizationEmailLogSection } from '../components/page/OrganizationEmailLogSection';
import { OrganizationEmailsSection } from '../components/page/OrganizationEmailsSection';
import { OrganizationEventsSection } from '../components/page/OrganizationEventsSection';
import { OrganizationImportedMetadataSection } from '../components/page/OrganizationImportedMetadataSection';
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
      notFoundMessage='Organization not found.'
      parent={{ label: 'Organizations', href: '/admin/filemaker/organizations' }}
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => startTransition(() => { router.push('/admin/filemaker/organizations'); })}
      isSaving={updateSetting.isPending}
    >
      {isPageLoading ? null : (
        <>
          <OrganizationBasicInfoSection />
          <OrganizationAddressesSection />
          {isCreateMode ? null : (
            <>
              <OrganizationLegacyMetadataSection />
              <OrganizationMongoSummarySection />
              <OrganizationImportedMetadataSection />
              <OrganizationLegacyDemandSection />
              <OrganizationPersonsSection />
              <OrganizationEventsSection />
              <OrganizationContactLogsSection />
              <OrganizationEmailsSection />
              <OrganizationWebsitesSection />
              <OrganizationEmailLogSection />
              <OrganizationCampaignDeliveriesSection />
            </>
          )}
        </>
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
