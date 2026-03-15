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
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Filemaker', href: '/admin/filemaker' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
