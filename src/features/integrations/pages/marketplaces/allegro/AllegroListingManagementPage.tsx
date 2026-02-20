import Link from 'next/link';
import React from 'react';

import { SectionHeader, EmptyState } from '@/shared/ui';

export default function AllegroListingManagementPage(): React.JSX.Element {
  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Listing Management'
        description='Track listing status, syncs, and actions for Allegro.'
        eyebrow={(
          <Link
            href='/admin/integrations/marketplaces/allegro'
            className='text-blue-300 hover:text-blue-200'
          >
            ← Allegro
          </Link>
        )}
        className='mb-6'
      />

      <EmptyState
        title='No listings'
        description='Listing management controls will appear here.'
        variant='compact'
        className='bg-card/40 border-dashed border-border/60 py-8'
      />
    </div>
  );
}
