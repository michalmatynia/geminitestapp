import * as React from 'react';

import { AdminIntegrationsPageLayout, CompactEmptyState } from '@/shared/ui';

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
    <AdminIntegrationsPageLayout
      title={pageTitle}
      description={pageDescription}
      current={breadcrumbTitle}
      parent={{ label: 'Allegro', href: '/admin/integrations/marketplaces/allegro' }}
    >
      {children ??
        (emptyState ? (
          <CompactEmptyState
            title={emptyStateTitle ?? ''}
            description={emptyStateDescription}
            className='border-dashed border-border/60 bg-card/40 py-8'
           />
        ) : null)}
    </AdminIntegrationsPageLayout>
  );
}
