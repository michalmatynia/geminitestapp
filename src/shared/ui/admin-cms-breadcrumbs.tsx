import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminCmsBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminCmsBreadcrumbs({
  current,
  parent,
  className,
}: AdminCmsBreadcrumbsProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'CMS', href: '/admin/cms' }}
      {...breadcrumbProps}
    />
  );
}
