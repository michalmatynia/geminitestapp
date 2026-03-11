import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminCmsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminCmsBreadcrumbsProps = {
  current: string;
  parent?: AdminCmsBreadcrumbsNode;
  className?: string;
};

export function AdminCmsBreadcrumbs({
  current,
  parent,
  className,
}: AdminCmsBreadcrumbsProps): React.JSX.Element {
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'CMS', href: '/admin/cms' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
