import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminCaseResolverBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminCaseResolverBreadcrumbs({
  current,
  parent,
  className,
}: AdminCaseResolverBreadcrumbsProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Case Resolver', href: '/admin/case-resolver' }}
      {...breadcrumbProps}
    />
  );
}
