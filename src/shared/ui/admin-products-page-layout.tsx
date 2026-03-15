import * as React from 'react';

import { AdminProductsBreadcrumbs } from './admin-products-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminProductsBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminProductsPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminProductsBreadcrumbsNode;
};

export function AdminProductsPageLayout({
  current,
  parent,
  ...props
}: AdminProductsPageLayoutProps): React.JSX.Element {
  const breadcrumbProps = { current, parent };
  const eyebrow = <AdminProductsBreadcrumbs {...breadcrumbProps} />;
  const pageLayoutProps = { ...props, eyebrow };

  return (
    <PageLayout {...pageLayoutProps} />
  );
}
