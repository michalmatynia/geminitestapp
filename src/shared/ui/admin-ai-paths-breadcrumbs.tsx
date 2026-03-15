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
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'AI Paths', href: '/admin/ai-paths' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
