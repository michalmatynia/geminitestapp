import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminSettingsBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminSettingsBreadcrumbs({
  current,
  parent,
  className,
}: AdminSettingsBreadcrumbsProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Settings', href: '/admin/settings' }}
      {...breadcrumbProps}
      baseClassName='mb-2'
    />
  );
}
