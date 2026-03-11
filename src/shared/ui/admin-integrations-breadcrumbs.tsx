import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminIntegrationsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminIntegrationsBreadcrumbsProps = {
  current: string;
  parent?: AdminIntegrationsBreadcrumbsNode;
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
