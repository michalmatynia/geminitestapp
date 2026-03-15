import * as React from 'react';

import { cn } from '@/shared/utils';

import { Breadcrumbs } from './Breadcrumbs';

export type AdminBreadcrumbNode = {
  label: string;
  href?: string;
};

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

export type AdminSectionBreadcrumbsProps = {
  section: AdminBreadcrumbNode;
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
  baseClassName?: string;
};

export function AdminSectionBreadcrumbs({
  section,
  current,
  parent,
  className,
  baseClassName,
}: AdminSectionBreadcrumbsProps): React.JSX.Element {
  const items = buildAdminSectionBreadcrumbItems({ section, current, parent });
  const resolvedClassName = baseClassName ? cn(baseClassName, className) : className;

  return <Breadcrumbs items={items} className={resolvedClassName} />;
}
export type AdminSectionBreadcrumbsConfig = {
  section: AdminBreadcrumbNode;
  current: string;
  parent?: AdminBreadcrumbNode;
};
