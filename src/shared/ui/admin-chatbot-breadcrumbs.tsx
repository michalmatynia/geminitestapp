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
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Chatbot', href: '/admin/chatbot' }}
      parent={parent}
      current={current}
      className={className}
    />
  );
}
