import * as React from 'react';

import { AdminIntegrationsBreadcrumbs, EmptyState, PageLayout } from '@/shared/ui';

type AllegroSubpageScaffoldProps = {
  title: string;
  description?: string;
  emptyState?: {
    title: string;
    description?: string;
  };
  children?: React.ReactNode;
};

export function AllegroSubpageScaffold({
  title,
  description,
  emptyState,
  children,
}: AllegroSubpageScaffoldProps): React.JSX.Element {
  const pageTitle = title;
  const pageDescription = description;
  const breadcrumbTitle = title;
  const emptyStateTitle = emptyState?.title ?? pageTitle;
  const emptyStateDescription = emptyState?.description;

  return (
    <PageLayout
      title={pageTitle}
      description={pageDescription}
      eyebrow={
        <AdminIntegrationsBreadcrumbs
          current={breadcrumbTitle}
          parent={{ label: 'Allegro', href: '/admin/integrations/marketplaces/allegro' }}
        />
      }
      containerClassName='container mx-auto max-w-5xl py-10'
    >
      {children ??
        (emptyState ? (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            variant='compact'
            className='border-dashed border-border/60 bg-card/40 py-8'
          />
        ) : null)}
    </PageLayout>
  );
}
