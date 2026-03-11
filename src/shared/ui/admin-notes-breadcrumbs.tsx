import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminNotesBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminNotesBreadcrumbsProps = {
  current: string;
  parent?: AdminNotesBreadcrumbsNode;
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
