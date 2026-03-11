import * as React from 'react';

import { AdminChatbotBreadcrumbs } from './admin-chatbot-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminChatbotBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminChatbotPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminChatbotBreadcrumbsNode;
};

export function AdminChatbotPageLayout({
  current,
  parent,
  containerClassName = 'mx-auto w-full max-w-none py-10',
  ...props
}: AdminChatbotPageLayoutProps): React.JSX.Element {
  return (
    <PageLayout
      eyebrow={<AdminChatbotBreadcrumbs current={current} parent={parent} />}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
