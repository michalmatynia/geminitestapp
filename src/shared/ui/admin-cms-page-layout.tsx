import * as React from 'react';

import { AdminCmsBreadcrumbs } from './admin-cms-breadcrumbs';
import { AdminWidePageLayout } from './admin-wide-page-layout';

type AdminCmsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminCmsPageLayoutProps = Omit<React.ComponentProps<typeof AdminWidePageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminCmsBreadcrumbsNode;
};

export function AdminCmsPageLayout({
  current,
  parent,
  ...props
}: AdminCmsPageLayoutProps): React.JSX.Element {
  return (
    <AdminWidePageLayout
      eyebrow={<AdminCmsBreadcrumbs current={current} parent={parent} className='mb-2' />}
      {...props}
    />
  );
}
