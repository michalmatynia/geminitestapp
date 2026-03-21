import * as React from 'react';

import type { AdminSectionBreadcrumbWrapperProps } from '@/shared/contracts/ui';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export function AdminFilemakerBreadcrumbs({
  current,
  parent,
  className,
}: AdminSectionBreadcrumbWrapperProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Filemaker', href: '/admin/filemaker' }}
      {...breadcrumbProps}
    />
  );
}
