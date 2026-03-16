import * as React from 'react';

import { AdminSectionBreadcrumbs, type AdminBreadcrumbNode } from './admin-section-breadcrumbs';

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
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Chatbot', href: '/admin/chatbot' }}
      {...breadcrumbProps}
    />
  );
}
