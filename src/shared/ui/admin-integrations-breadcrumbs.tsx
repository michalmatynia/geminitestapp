import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminIntegrationsBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminIntegrationsBreadcrumbs({
  current,
  parent,
  className,
}: AdminIntegrationsBreadcrumbsProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Integrations', href: '/admin/integrations' }}
      {...breadcrumbProps}
    />
  );
}
