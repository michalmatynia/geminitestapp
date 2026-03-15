import * as React from 'react';

import { Breadcrumbs } from './Breadcrumbs';
import { buildAdminSectionBreadcrumbItems, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

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
  const items = buildAdminSectionBreadcrumbItems({
    section: { label: 'Agent Creator', href: '/admin/agentcreator' },
    parent,
    current,
  });
  const resolvedClassName = className;

  return (
    <Breadcrumbs items={items} className={resolvedClassName} />
  );
}
