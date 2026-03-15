import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminProductsBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminProductsBreadcrumbs({
  current,
  parent,
  className,
}: AdminProductsBreadcrumbsProps): React.JSX.Element {
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Products', href: '/admin/products' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
