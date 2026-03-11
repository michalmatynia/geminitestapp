import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminDatabaseBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminDatabaseBreadcrumbsProps = {
  current: string;
  parent?: AdminDatabaseBreadcrumbsNode;
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
