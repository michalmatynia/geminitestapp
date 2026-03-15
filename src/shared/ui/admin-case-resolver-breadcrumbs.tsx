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
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Case Resolver', href: '/admin/case-resolver' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
