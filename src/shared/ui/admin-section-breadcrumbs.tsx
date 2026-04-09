import * as React from 'react';

import type { AdminBreadcrumbNode, AdminSectionBreadcrumbsConfig, AdminSectionBreadcrumbsProps, AdminSectionBreadcrumbWrapperProps } from '@/shared/contracts/ui/base';
import { cn } from '@/shared/utils/ui-utils';

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
  'data-testid': testId,
}: AdminSectionBreadcrumbsProps): React.JSX.Element {
  const items = buildAdminSectionBreadcrumbItems({ section, current, parent });
  const resolvedClassName = baseClassName ? cn(baseClassName, className) : className;

  return (
    <AdminFavoriteBreadcrumbRow data-testid={testId}>
      <Breadcrumbs items={items} className={resolvedClassName} />
    </AdminFavoriteBreadcrumbRow>
  );
}

type CreateAdminSectionBreadcrumbsConfig = {
  section: AdminBreadcrumbNode;
  baseClassName?: string;
  displayName?: string;
};

export function createAdminSectionBreadcrumbs({
  section,
  baseClassName,
  displayName,
}: CreateAdminSectionBreadcrumbsConfig): React.FC<AdminSectionBreadcrumbWrapperProps> {
  const AdminSectionBreadcrumbsWrapper: React.FC<AdminSectionBreadcrumbWrapperProps> = ({
    current,
    parent,
    className,
  }) => (
    <AdminSectionBreadcrumbs
      section={section}
      current={current}
      parent={parent}
      className={className}
      baseClassName={baseClassName}
    />
  );

  AdminSectionBreadcrumbsWrapper.displayName = displayName ?? 'AdminSectionBreadcrumbsWrapper';

  return AdminSectionBreadcrumbsWrapper;
}

export type { AdminSectionBreadcrumbsConfig, AdminSectionBreadcrumbsProps };
