import * as React from 'react';

import type {
  AdminBreadcrumbNode,
  AdminSectionBreadcrumbsConfig,
  AdminSectionBreadcrumbsProps,
} from '@/shared/contracts/ui';
import { cn } from '@/shared/utils';

import { AdminFavoriteBreadcrumbRow } from './admin-favorite-breadcrumb-row';
import { Breadcrumbs } from './Breadcrumbs';

export type { AdminBreadcrumbNode };

export function buildAdminSectionBreadcrumbItems({
  section,
  current,
  parent,
}: AdminSectionBreadcrumbsConfig): AdminBreadcrumbNode[] {
  return [
    { label: 'Admin', href: '/admin' },
    section,
    ...(parent ? [parent] : []),
    { label: current },
  ];
}

export function AdminSectionBreadcrumbs({
  section,
  current,
  parent,
  className,
  baseClassName,
}: AdminSectionBreadcrumbsProps): React.JSX.Element {
  const items = buildAdminSectionBreadcrumbItems({ section, current, parent });
  const resolvedClassName = baseClassName ? cn(baseClassName, className) : className;

  return (
    <AdminFavoriteBreadcrumbRow>
      <Breadcrumbs items={items} className={resolvedClassName} />
    </AdminFavoriteBreadcrumbRow>
  );
}

export type { AdminSectionBreadcrumbsConfig, AdminSectionBreadcrumbsProps };
