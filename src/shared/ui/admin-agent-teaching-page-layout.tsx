import * as React from 'react';

import { AdminAgentTeachingBreadcrumbs } from './admin-agent-teaching-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminAgentTeachingBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminAgentTeachingPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminAgentTeachingBreadcrumbsNode;
};

export function AdminAgentTeachingPageLayout({
  current,
  parent,
  ...props
}: AdminAgentTeachingPageLayoutProps): React.JSX.Element {
  const breadcrumbProps = { current, parent };
  const eyebrow = <AdminAgentTeachingBreadcrumbs {...breadcrumbProps} />;
  const pageLayoutProps = { ...props, eyebrow };

  return (
    <PageLayout {...pageLayoutProps} />
  );
}
