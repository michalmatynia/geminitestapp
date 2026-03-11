import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminAgentCreatorBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminAgentCreatorBreadcrumbsProps = {
  current: string;
  parent?: AdminAgentCreatorBreadcrumbsNode;
  className?: string;
};

export function AdminAgentCreatorBreadcrumbs({
  current,
  parent,
  className,
}: AdminAgentCreatorBreadcrumbsProps): React.JSX.Element {
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Agent Creator', href: '/admin/agentcreator' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
