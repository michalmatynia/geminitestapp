import * as React from 'react';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminChatbotBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminChatbotBreadcrumbsProps = {
  current: string;
  parent?: AdminChatbotBreadcrumbsNode;
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
