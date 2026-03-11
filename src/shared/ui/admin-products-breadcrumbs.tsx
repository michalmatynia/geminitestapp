import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminProductsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminProductsBreadcrumbsProps = {
  current: string;
  parent?: AdminProductsBreadcrumbsNode;
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
