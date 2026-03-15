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
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Databases', href: '/admin/databases/engine' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
