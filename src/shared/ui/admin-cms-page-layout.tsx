import * as React from 'react';

import { AdminCmsBreadcrumbs } from './admin-cms-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminCmsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminCmsPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminCmsBreadcrumbsNode;
};

export function AdminCmsPageLayout({
  current,
  parent,
  containerClassName,
  ...props
}: AdminCmsPageLayoutProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className: 'mb-2' };
  const eyebrow = <AdminCmsBreadcrumbs {...breadcrumbProps} />;
  const resolvedContainerClassName = containerClassName ?? 'mx-auto w-full max-w-none py-10';
  const pageLayoutProps = {
    ...props,
    eyebrow,
    containerClassName: resolvedContainerClassName,
  };

  return (
    <PageLayout {...pageLayoutProps} />
  );
}
