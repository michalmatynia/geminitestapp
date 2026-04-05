import * as React from 'react';

import type { AdminBreadcrumbNode } from '@/shared/contracts/ui/ui/base';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';
import { PageLayout } from './PageLayout';

export type AdminPageBreadcrumbNode = AdminBreadcrumbNode;

type AdminPageBreadcrumbsProps = {
  current: string;
  parent?: AdminPageBreadcrumbNode;
  className?: string;
};

type AdminPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current?: string;
  parent?: AdminPageBreadcrumbNode;
  activeTab?: string;
};

type CreateAdminPageLayoutConfig = {
  Breadcrumbs: React.ComponentType<AdminPageBreadcrumbsProps>;
  breadcrumbClassName?: string;
  containerClassName?: string;
};

type CreateAdminSectionPageLayoutConfig = {
  section: AdminPageBreadcrumbNode;
  breadcrumbClassName?: string;
  baseBreadcrumbClassName?: string;
  containerClassName?: string;
  breadcrumbDisplayName?: string;
  displayName?: string;
};

export function createAdminPageLayout({
  Breadcrumbs,
  breadcrumbClassName,
  containerClassName,
}: CreateAdminPageLayoutConfig): React.FC<AdminPageLayoutProps> {
  const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
    current = '',
    parent,
    activeTab: _activeTab,
    containerClassName: containerClassNameProp,
    ...props
  }): React.JSX.Element => {
    const eyebrow = (
      <Breadcrumbs
        current={current}
        parent={parent}
        {...(breadcrumbClassName === undefined ? {} : { className: breadcrumbClassName })}
      />
    );
    const resolvedContainerClassName = containerClassNameProp ?? containerClassName;
    const pageLayoutProps = {
      ...props,
      eyebrow,
      ...(resolvedContainerClassName === undefined
        ? {}
        : { containerClassName: resolvedContainerClassName }),
    };

    return (
      <PageLayout {...pageLayoutProps} />
    );
  };

  AdminPageLayout.displayName = 'AdminPageLayout';

  return AdminPageLayout;
}

export function createAdminSectionPageLayout({
  section,
  breadcrumbClassName,
  baseBreadcrumbClassName,
  containerClassName,
  breadcrumbDisplayName,
  displayName,
}: CreateAdminSectionPageLayoutConfig): React.FC<AdminPageLayoutProps> {
  const Breadcrumbs = createAdminSectionBreadcrumbs({
    section,
    baseClassName: baseBreadcrumbClassName,
    displayName: breadcrumbDisplayName,
  });
  const AdminSectionPageLayout = createAdminPageLayout({
    Breadcrumbs,
    breadcrumbClassName,
    containerClassName,
  });

  AdminSectionPageLayout.displayName = displayName ?? 'AdminSectionPageLayout';

  return AdminSectionPageLayout;
}
