import * as React from 'react';

import type { AdminSectionBreadcrumbWrapperProps } from '@/shared/contracts/ui';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export function AdminAiPathsBreadcrumbs({
  current,
  parent,
  className,
}: AdminSectionBreadcrumbWrapperProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className };
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'AI Paths', href: '/admin/ai-paths' }}
      {...breadcrumbProps}
    />
  );
}
