import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminNotesBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminNotesBreadcrumbs({
  current,
  parent,
  className,
}: AdminNotesBreadcrumbsProps): React.JSX.Element {
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Notes', href: '/admin/notes' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
