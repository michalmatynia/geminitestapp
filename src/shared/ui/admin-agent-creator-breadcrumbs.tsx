import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminAgentCreatorBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminAgentCreatorBreadcrumbs({
  current,
  parent,
  className,
}: AdminAgentCreatorBreadcrumbsProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Agent Creator', href: '/admin/agentcreator' }}
      {...breadcrumbProps}
    />
  );
}
