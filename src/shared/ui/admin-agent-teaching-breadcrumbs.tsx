import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminAgentTeachingBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminAgentTeachingBreadcrumbsProps = {
  current: string;
  parent?: AdminAgentTeachingBreadcrumbsNode;
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
