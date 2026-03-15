import * as React from 'react';

import { Breadcrumbs } from './Breadcrumbs';
import { buildAdminSectionBreadcrumbItems, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

type AdminChatbotBreadcrumbsProps = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};

export function AdminChatbotBreadcrumbs({
  current,
  parent,
  className,
}: AdminChatbotBreadcrumbsProps): React.JSX.Element {
  const items = buildAdminSectionBreadcrumbItems({
    section: { label: 'Chatbot', href: '/admin/chatbot' },
    parent,
    current,
  });
  const resolvedClassName = className;

  return (
    <Breadcrumbs items={items} className={resolvedClassName} />
  );
}
