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
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Integrations', href: '/admin/integrations' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
