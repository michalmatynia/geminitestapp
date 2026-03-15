import * as React from 'react';

import { Breadcrumbs } from './Breadcrumbs';
import { buildAdminSectionBreadcrumbItems, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

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
  const items = buildAdminSectionBreadcrumbItems({
    section: { label: 'Case Resolver', href: '/admin/case-resolver' },
    parent,
    current,
  });
  const resolvedClassName = className;

  return (
    <Breadcrumbs items={items} className={resolvedClassName} />
  );
}
