import * as React from 'react';

import { PageLayout } from './PageLayout';

export type AdminPageBreadcrumbNode = {
  label: string;
  href?: string;
};

type AdminPageBreadcrumbsProps = {
  current: string;
  parent?: AdminPageBreadcrumbNode;
  className?: string;
};

type AdminPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminPageBreadcrumbNode;
};

type CreateAdminPageLayoutConfig = {
  Breadcrumbs: React.ComponentType<AdminPageBreadcrumbsProps>;
  breadcrumbClassName?: string;
  containerClassName?: string;
};

export function createAdminPageLayout({
  Breadcrumbs,
  breadcrumbClassName,
  containerClassName,
}: CreateAdminPageLayoutConfig): (props: AdminPageLayoutProps) => React.JSX.Element {
  return function AdminPageLayout({
    current,
    parent,
    containerClassName: containerClassNameProp,
    ...props
  }: AdminPageLayoutProps): React.JSX.Element {
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
}
