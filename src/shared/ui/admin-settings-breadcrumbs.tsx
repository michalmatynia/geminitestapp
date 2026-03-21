import * as React from 'react';

import type { AdminSectionBreadcrumbWrapperProps } from '@/shared/contracts/ui';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export function AdminSettingsBreadcrumbs({
  current,
  parent,
  className,
}: AdminSectionBreadcrumbWrapperProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Settings', href: '/admin/settings' }}
      {...breadcrumbProps}
      baseClassName='mb-2'
    />
  );
}
