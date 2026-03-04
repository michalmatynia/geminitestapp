'use client';

import React from 'react';

import {
  AdminFilemakerOrganizationEditPageProvider,
  useAdminFilemakerOrganizationEditPageContext,
} from '../context/AdminFilemakerOrganizationEditPageContext';
import { OrganizationBasicInfoSection } from '../components/page/OrganizationBasicInfoSection';
import { OrganizationEmailsSection } from '../components/page/OrganizationEmailsSection';
import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';

function AdminFilemakerOrganizationEditPageInner(): React.JSX.Element {
  const { organization, handleSave, updateSetting, router } =
    useAdminFilemakerOrganizationEditPageContext();

  return (
    <FilemakerPartyEditPageLayout
      itemName={organization?.name ?? null}
      notFoundMessage='Organization not found.'
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => router.push('/admin/filemaker')}
      isSaving={updateSetting.isPending}
    >
      <OrganizationBasicInfoSection />
      <OrganizationEmailsSection />
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
