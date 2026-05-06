'use client';

import React, { startTransition } from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';

import { FilemakerGoalAutomationPanel } from '../components/shared/FilemakerGoalAutomationPanel';
import { OrganizationJobListingsSection } from '../components/page/OrganizationJobListingsSection';
import {
  AdminFilemakerOrganizationEditPageProvider,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../context/AdminFilemakerOrganizationEditPageContext';

type OrganizationBreadcrumbContext = {
  label: string;
  nameForTitle: string | null;
  organizationId: string;
  organizationHref: string;
};

const resolveOrganizationBreadcrumbContext = (
  organizationName: string | null | undefined,
  organizationId: string
): OrganizationBreadcrumbContext => {
  if (organizationId.length > 0) {
    return {
      label: organizationName ?? 'Organization',
      nameForTitle: organizationName,
      organizationId,
      organizationHref: `/admin/filemaker/organizations/${encodeURIComponent(organizationId)}`,
    };
  }

  return {
    label: 'Organization',
    nameForTitle: null,
    organizationId,
    organizationHref: '/admin/filemaker/organizations',
  };
};

// eslint-disable-next-line complexity
function AdminFilemakerOrganizationJobListingsPageInner(): React.JSX.Element {
  const { isLoading, organization, router } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const [hasMounted, setHasMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('listings');
  const [automationUrl, setAutomationUrl] = React.useState('');

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  // Pre-populate automation URL from the organization's job board source once loaded
  React.useEffect(() => {
    if (!organization) return;
    const defaultUrl =
      organization.jobBoardSourceUrl?.trim() ??
      organization.jobBoardCompanyWebsiteUrl?.trim() ??
      '';
    if (defaultUrl !== '' && automationUrl === '') {
      setAutomationUrl(defaultUrl);
    }
  }, [organization, automationUrl]);

  const handleAutomateUrl = React.useCallback((url: string): void => {
    setAutomationUrl(url);
    setActiveTab('automation');
  }, []);

  const isPageLoading = !hasMounted || isLoading;
  const organizationName = organization?.name ?? null;
  const organizationId = organization?.id ?? '';
  const { label: parentLabel, nameForTitle, organizationHref } = resolveOrganizationBreadcrumbContext(
    organizationName,
    organizationId
  );
  const pageTitle = isPageLoading ? 'Loading...' : (nameForTitle ?? 'Job Listings');

  const handleBackToOrganization = React.useCallback((): void => {
    startTransition(() => {
      router.push(organizationHref);
    });
  }, [organizationHref, router]);

  return (
    <div className='w-full max-w-none space-y-3 pb-4 pt-0'>
      <AdminTitleBreadcrumbHeader
        title={
          <h1 className='text-3xl font-bold tracking-tight text-white'>
            {pageTitle}
          </h1>
        }
        breadcrumb={
          <AdminFilemakerBreadcrumbs
            parent={{
              label: parentLabel,
              href: organizationHref,
            }}
            current='Job Listings'
          />
        }
        actions={
          <button
            type='button'
            className='inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-3 text-xs text-gray-300 hover:bg-white/5'
            onClick={handleBackToOrganization}
          >
            Back to organization
          </button>
        }
        titleStackClassName='shrink-0 min-w-max'
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end pt-0'
      />
      {!isPageLoading ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value='listings'>Job Listings</TabsTrigger>
            <TabsTrigger value='automation'>Goal Automation</TabsTrigger>
          </TabsList>
          <TabsContent value='listings'>
            <OrganizationJobListingsSection onAutomateUrl={handleAutomateUrl} />
          </TabsContent>
          <TabsContent value='automation' className='pt-2'>
            <FilemakerGoalAutomationPanel defaultUrl={automationUrl} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

export function AdminFilemakerOrganizationJobListingsPage(): React.JSX.Element {
  return (
    <AdminFilemakerOrganizationEditPageProvider>
      <AdminFilemakerOrganizationJobListingsPageInner />
    </AdminFilemakerOrganizationEditPageProvider>
  );
}
