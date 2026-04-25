'use client';

import React, { startTransition } from 'react';

import { OrganizationAddressesSection } from '../components/page/OrganizationAddressesSection';
import { OrganizationBasicInfoSection } from '../components/page/OrganizationBasicInfoSection';
import { OrganizationEmailLogSection } from '../components/page/OrganizationEmailLogSection';
import { OrganizationEmailsSection } from '../components/page/OrganizationEmailsSection';
import { OrganizationLegacyDemandSection } from '../components/page/OrganizationLegacyDemandSection';
import { OrganizationLegacyMetadataSection } from '../components/page/OrganizationLegacyMetadataSection';
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

  return (
    <FilemakerPartyEditPageLayout
      itemName={
        isCreateMode
          ? 'Create Organization'
          : (organization?.name ?? (isLoading ? 'Loading...' : null))
      }
      notFoundMessage='Organization not found.'
      parent={{ label: 'Organizations', href: '/admin/filemaker/organizations' }}
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => startTransition(() => { router.push('/admin/filemaker/organizations'); })}
      isSaving={updateSetting.isPending}
    >
      {isLoading ? null : (
        <>
          <OrganizationBasicInfoSection />
          <OrganizationAddressesSection />
          {isCreateMode ? null : (
            <>
              <OrganizationLegacyMetadataSection />
              <OrganizationLegacyDemandSection />
              <OrganizationEmailsSection />
              <OrganizationEmailLogSection />
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
