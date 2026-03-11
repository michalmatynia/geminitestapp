import * as React from 'react';

import { AdminIntegrationsPageLayout, EmptyState } from '@/shared/ui';

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
  return (
    <AdminIntegrationsPageLayout
      title={title}
      current={title}
      parent={{ label: 'Allegro', href: '/admin/integrations/marketplaces/allegro' }}
      description={description}
    >
      {children ??
        (emptyState ? (
          <EmptyState
            title={emptyState.title}
            description={emptyState.description}
            variant='compact'
            className='border-dashed border-border/60 bg-card/40 py-8'
          />
        ) : null)}
    </AdminIntegrationsPageLayout>
  );
}
