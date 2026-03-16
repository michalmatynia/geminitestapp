import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminFilemakerBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminFilemakerBreadcrumbs({
  current,
  parent,
  className,
}: AdminFilemakerBreadcrumbsProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Filemaker', href: '/admin/filemaker' }}
      {...breadcrumbProps}
    />
  );
}
