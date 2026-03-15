import * as React from 'react';

import { AdminDatabaseBreadcrumbs } from './admin-database-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminDatabaseBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminDatabasePageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminDatabaseBreadcrumbsNode;
};

export function AdminDatabasePageLayout({
  current,
  parent,
  ...props
}: AdminDatabasePageLayoutProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className: 'mb-2' };
  const eyebrow = <AdminDatabaseBreadcrumbs {...breadcrumbProps} />;
  const pageLayoutProps = { ...props, eyebrow };

  return (
    <PageLayout {...pageLayoutProps} />
  );
}
