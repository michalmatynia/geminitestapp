import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminFilemakerBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminFilemakerBreadcrumbsProps = {
  current: string;
  parent?: AdminFilemakerBreadcrumbsNode;
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
