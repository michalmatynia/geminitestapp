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

const useHasMounted = (): boolean => {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
};

const useOrganizationJobListingAutomation = (organization: {
  jobBoardCompanyWebsiteUrl?: string | null;
  jobBoardSourceUrl?: string | null;
} | null): {
  activeTab: string;
  automationUrl: string;
  handleAutomateUrl: (url: string) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
} => {
  const [activeTab, setActiveTab] = React.useState('listings');
  const [automationUrl, setAutomationUrl] = React.useState('');

  React.useEffect(() => {
    if (organization === null) return;
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

  return { activeTab, automationUrl, handleAutomateUrl, setActiveTab };
};

const OrganizationJobListingsHeader = ({
  onBack,
  organizationHref,
  pageTitle,
  parentLabel,
}: {
  onBack: () => void;
  organizationHref: string;
  pageTitle: string;
  parentLabel: string;
}): React.JSX.Element => (
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
        onClick={onBack}
      >
        Back to organization
      </button>
    }
    titleStackClassName='shrink-0 min-w-max'
    actionsClassName='relative z-0 min-w-0 flex-1 justify-end pt-0'
  />
);

const OrganizationJobListingsTabs = ({
  activeTab,
  automationUrl,
  onAutomateUrl,
  setActiveTab,
}: {
  activeTab: string;
  automationUrl: string;
  onAutomateUrl: (url: string) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}): React.JSX.Element => (
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList>
      <TabsTrigger value='listings'>Job Listings</TabsTrigger>
      <TabsTrigger value='automation'>Goal Automation</TabsTrigger>
    </TabsList>
    <TabsContent value='listings'>
      <OrganizationJobListingsSection onAutomateUrl={onAutomateUrl} />
    </TabsContent>
    <TabsContent value='automation' className='pt-2'>
      <FilemakerGoalAutomationPanel defaultUrl={automationUrl} />
    </TabsContent>
  </Tabs>
);

const resolvePageTitle = (isPageLoading: boolean, nameForTitle: string | null): string => {
  if (isPageLoading) return 'Loading...';
  return nameForTitle ?? 'Job Listings';
};

const resolveOrganizationJobListingsViewModel = ({
  hasMounted,
  isLoading,
  organization,
}: {
  hasMounted: boolean;
  isLoading: boolean;
  organization: { id: string; name?: string | null } | null | undefined;
}): {
  isPageLoading: boolean;
  organizationHref: string;
  pageTitle: string;
  parentLabel: string;
} => {
  const isPageLoading = hasMounted === false || isLoading;
  const organizationName = organization?.name ?? null;
  const organizationId = organization?.id ?? '';
  const { label: parentLabel, nameForTitle, organizationHref } =
    resolveOrganizationBreadcrumbContext(organizationName, organizationId);
  return {
    isPageLoading,
    organizationHref,
    pageTitle: resolvePageTitle(isPageLoading, nameForTitle),
    parentLabel,
  };
};

function AdminFilemakerOrganizationJobListingsPageInner(): React.JSX.Element {
  const { isLoading, organization, router } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const hasMounted = useHasMounted();
  const { activeTab, automationUrl, handleAutomateUrl, setActiveTab } =
    useOrganizationJobListingAutomation(organization);
  const { isPageLoading, organizationHref, pageTitle, parentLabel } =
    resolveOrganizationJobListingsViewModel({ hasMounted, isLoading, organization });

  const handleBackToOrganization = React.useCallback((): void => {
    startTransition(() => {
      router.push(organizationHref);
    });
  }, [organizationHref, router]);

  return (
    <div className='w-full max-w-none space-y-3 pb-4 pt-0'>
      <OrganizationJobListingsHeader
        onBack={handleBackToOrganization}
        organizationHref={organizationHref}
        pageTitle={pageTitle}
        parentLabel={parentLabel}
      />
      {isPageLoading === false ? (
        <OrganizationJobListingsTabs
          activeTab={activeTab}
          automationUrl={automationUrl}
          onAutomateUrl={handleAutomateUrl}
          setActiveTab={setActiveTab}
        />
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
