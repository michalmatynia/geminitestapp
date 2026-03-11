import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminCaseResolverBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminCaseResolverBreadcrumbsProps = {
  current: string;
  parent?: AdminCaseResolverBreadcrumbsNode;
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
