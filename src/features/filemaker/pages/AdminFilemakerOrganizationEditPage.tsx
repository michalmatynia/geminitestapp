'use client';

import React from 'react';
import { 
  Breadcrumbs,
  FormActions,
} from '@/shared/ui';
import { 
  AdminFilemakerOrganizationEditPageProvider, 
  useAdminFilemakerOrganizationEditPageContext 
} from '../context/AdminFilemakerOrganizationEditPageContext';
import { OrganizationBasicInfoSection } from '../components/page/OrganizationBasicInfoSection';
import { OrganizationEmailsSection } from '../components/page/OrganizationEmailsSection';

function AdminFilemakerOrganizationEditPageInner(): React.JSX.Element {
  const { 
    organization, 
    handleSave, 
    updateSetting,
    router
  } = useAdminFilemakerOrganizationEditPageContext();

  if (!organization) {
    return (
      <div className='container mx-auto py-8 text-center text-gray-500'>
        Organization not found.
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Breadcrumbs
          items={[
            { label: 'Filemaker', href: '/admin/filemaker' },
            { label: organization.name },
          ]}
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <OrganizationBasicInfoSection />
          <OrganizationEmailsSection />
          
          {/* More sections will be added here */}
        </div>

        <div className='space-y-6'>
          {/* Sidebar sections will be added here */}
        </div>
      </div>

      <FormActions
        onSave={() => void handleSave()}
        onCancel={() => router.push('/admin/filemaker')}
        isSaving={updateSetting.isPending}
      />
    </div>
  );
}

export function AdminFilemakerOrganizationEditPage(): React.JSX.Element {
  return (
    <AdminFilemakerOrganizationEditPageProvider>
      <AdminFilemakerOrganizationEditPageInner />
    </AdminFilemakerOrganizationEditPageProvider>
  );
}
