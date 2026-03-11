import * as React from 'react';

import { Breadcrumbs } from './Breadcrumbs';

type AdminSectionBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminSectionBreadcrumbsProps = {
  section: AdminSectionBreadcrumbsNode;
  current: string;
  parent?: AdminSectionBreadcrumbsNode;
  className?: string;
};

export function AdminSectionBreadcrumbs({
  section,
  current,
  parent,
  className,
}: AdminSectionBreadcrumbsProps): React.JSX.Element {
  return (
    <Breadcrumbs
      items={[
        { label: 'Admin', href: '/admin' },
        section,
        ...(parent ? [parent] : []),
        { label: current },
      ]}
      className={className}
    />
  );
}
