import * as React from 'react';

import { AdminCaseResolverBreadcrumbs } from './admin-case-resolver-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminCaseResolverBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminCaseResolverPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminCaseResolverBreadcrumbsNode;
};

export function AdminCaseResolverPageLayout({
  current,
  parent,
  ...props
}: AdminCaseResolverPageLayoutProps): React.JSX.Element {
  return (
    <PageLayout
      eyebrow={
        <AdminCaseResolverBreadcrumbs current={current} parent={parent} className='mb-2' />
      }
      {...props}
    />
  );
}
