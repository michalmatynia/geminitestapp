import Link from 'next/link';
import React from 'react';

import { SectionHeader, EmptyState } from '@/shared/ui';

export default function AllegroConnectionsPage(): React.JSX.Element {
  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Connections'
        description='Manage Allegro accounts, credentials, and sync settings.'
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
        title='Setup required'
        description='Connection setup will appear here.'
        variant='compact'
        className='bg-card/40 border-dashed border-border/60 py-8'
      />
    </div>
  );
}
