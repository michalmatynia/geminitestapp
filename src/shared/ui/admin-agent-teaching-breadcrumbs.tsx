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
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Learner Agents', href: '/admin/agentcreator/teaching' }}
      {...breadcrumbProps}
    />
  );
}
