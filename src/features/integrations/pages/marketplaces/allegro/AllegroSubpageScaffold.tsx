import * as React from 'react';

import { EmptyState, SectionHeader, SectionHeaderBackLink } from '@/shared/ui';

type AllegroSubpageScaffoldProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
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
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title={title}
        description={description}
        eyebrow={
          <SectionHeaderBackLink href='/admin/integrations/marketplaces/allegro' arrow>
            Allegro
          </SectionHeaderBackLink>
        }
        className='mb-6'
      />

      {children ??
        (emptyState ? (
          <EmptyState
            title={emptyState.title}
            description={emptyState.description}
            variant='compact'
            className='border-dashed border-border/60 bg-card/40 py-8'
          />
        ) : null)}
    </div>
  );
}
