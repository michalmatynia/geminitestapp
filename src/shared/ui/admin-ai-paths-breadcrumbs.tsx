import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminAiPathsBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminAiPathsBreadcrumbs({
  current,
  parent,
  className,
}: AdminAiPathsBreadcrumbsProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'AI Paths', href: '/admin/ai-paths' }}
      {...breadcrumbProps}
    />
  );
}
