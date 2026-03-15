import * as React from 'react';

import { AdminAgentCreatorBreadcrumbs } from './admin-agent-creator-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminAgentCreatorBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminAgentCreatorPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminAgentCreatorBreadcrumbsNode;
};

export function AdminAgentCreatorPageLayout({
  current,
  parent,
  ...props
}: AdminAgentCreatorPageLayoutProps): React.JSX.Element {
  const breadcrumbProps = { current, parent };
  const eyebrow = <AdminAgentCreatorBreadcrumbs {...breadcrumbProps} />;
  const pageLayoutProps = { ...props, eyebrow };

  return (
    <PageLayout {...pageLayoutProps} />
  );
}
