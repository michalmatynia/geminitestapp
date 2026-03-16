import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

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
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Databases', href: '/admin/databases/engine' }}
      {...breadcrumbProps}
    />
  );
}
