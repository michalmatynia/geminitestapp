import * as React from 'react';

import type { AdminSectionBreadcrumbWrapperProps } from '@/shared/contracts/ui';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export function AdminProductsBreadcrumbs({
  current,
  parent,
  className,
}: AdminSectionBreadcrumbWrapperProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Products', href: '/admin/products' }}
      {...breadcrumbProps}
    />
  );
}
