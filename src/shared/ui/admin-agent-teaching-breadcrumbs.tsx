import * as React from 'react';

import { Breadcrumbs } from './Breadcrumbs';
import { buildAdminSectionBreadcrumbItems, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

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
  const items = buildAdminSectionBreadcrumbItems({
    section: { label: 'Learner Agents', href: '/admin/agentcreator/teaching' },
    parent,
    current,
  });
  const resolvedClassName = className;

  return (
    <Breadcrumbs items={items} className={resolvedClassName} />
  );
}
