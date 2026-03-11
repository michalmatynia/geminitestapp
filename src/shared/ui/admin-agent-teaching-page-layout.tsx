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
  return (
    <PageLayout
      eyebrow={
        <AdminAgentTeachingBreadcrumbs current={current} parent={parent} className='mb-2' />
      }
      {...props}
    />
  );
}
