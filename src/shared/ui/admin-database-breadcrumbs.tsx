import * as React from 'react';

import { Breadcrumbs } from './Breadcrumbs';
import { buildAdminSectionBreadcrumbItems, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminDatabaseBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminDatabaseBreadcrumbs({
  current,
  parent,
  className,
}: AdminDatabaseBreadcrumbsProps): React.JSX.Element {
  const items = buildAdminSectionBreadcrumbItems({
    section: { label: 'Databases', href: '/admin/databases/engine' },
    parent,
    current,
  });
  const resolvedClassName = className;

  return (
    <Breadcrumbs items={items} className={resolvedClassName} />
  );
}
