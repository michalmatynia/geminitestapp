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
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Notes', href: '/admin/notes' }}
      {...breadcrumbProps}
    />
  );
}
