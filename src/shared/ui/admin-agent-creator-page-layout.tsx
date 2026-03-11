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
  containerClassName = 'mx-auto w-full max-w-none py-10',
  ...props
}: AdminAgentCreatorPageLayoutProps): React.JSX.Element {
  return (
    <PageLayout
      eyebrow={<AdminAgentCreatorBreadcrumbs current={current} parent={parent} />}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
