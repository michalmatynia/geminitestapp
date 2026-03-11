import * as React from 'react';

import { AdminIntegrationsBreadcrumbs } from './admin-integrations-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminIntegrationsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminIntegrationsPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminIntegrationsBreadcrumbsNode;
};

export function AdminIntegrationsPageLayout({
  current,
  parent,
  containerClassName = 'container mx-auto max-w-5xl py-10',
  ...props
}: AdminIntegrationsPageLayoutProps): React.JSX.Element {
  return (
    <PageLayout
      eyebrow={<AdminIntegrationsBreadcrumbs current={current} parent={parent} />}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
