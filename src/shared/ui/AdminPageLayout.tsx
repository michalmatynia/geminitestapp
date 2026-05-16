import * as React from 'react';
import type { AdminBreadcrumbNode } from '@/shared/contracts/ui/base';
import { PageLayout } from './PageLayout';
import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminPageLayoutProps = React.ComponentProps<typeof PageLayout> & {
  section: AdminBreadcrumbNode;
  current: string;
  parent?: AdminBreadcrumbNode;
  breadcrumbClassName?: string;
};

export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  section,
  current,
  parent,
  breadcrumbClassName,
  children,
  ...props
}) => {
  const eyebrow = (
    <AdminSectionBreadcrumbs
      section={section}
      current={current}
      parent={parent}
      className={breadcrumbClassName}
    />
  );

  return (
    <PageLayout {...props} eyebrow={eyebrow}>
      {children}
    </PageLayout>
  );
};
