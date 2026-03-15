import * as React from 'react';

import { AdminNotesBreadcrumbs } from './admin-notes-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminNotesBreadcrumbsNode = {
  label: string;
  href?: string;
};

type AdminNotesPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
  parent?: AdminNotesBreadcrumbsNode;
};

export function AdminNotesPageLayout({
  current,
  parent,
  ...props
}: AdminNotesPageLayoutProps): React.JSX.Element {
  const breadcrumbProps = { current, parent, className: 'mb-2' };
  const eyebrow = <AdminNotesBreadcrumbs {...breadcrumbProps} />;
  const pageLayoutProps = { ...props, eyebrow };

  return (
    <PageLayout {...pageLayoutProps} />
  );
}
