import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminAiPathsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminAiPathsBreadcrumbsProps = {
  current: string;
  parent?: AdminAiPathsBreadcrumbsNode;
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
