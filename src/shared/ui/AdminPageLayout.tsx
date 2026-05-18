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

/**
 * Standardized layout wrapper for all admin-facing pages.
 * 
 * Provides consistent page scaffolding, including breadcrumb navigation (eyebrow) and base layout structure.
 * Consumes section information to automatically render the admin-specific breadcrumb trail.
 * 
 * @param section - The top-level breadcrumb node for the admin section
 * @param current - The current page title to display in breadcrumbs
 * @param parent - Optional parent breadcrumb node for nested section navigation
 */
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
