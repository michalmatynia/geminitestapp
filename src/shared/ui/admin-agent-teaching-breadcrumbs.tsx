import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminAgentTeachingBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminAgentTeachingBreadcrumbs({
  current,
  parent,
  className,
}: AdminAgentTeachingBreadcrumbsProps): React.JSX.Element {
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Learner Agents', href: '/admin/agentcreator/teaching' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
