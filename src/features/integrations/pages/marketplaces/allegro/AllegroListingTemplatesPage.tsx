import Link from 'next/link';
import React from 'react';

import { SectionHeader } from '@/shared/ui';

export default function AllegroListingTemplatesPage(): React.JSX.Element {
  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Listing Templates'
        description='Build reusable listing templates for Allegro.'
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

      <div className='rounded-md border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground'>
        Listing templates will appear here.
      </div>
    </div>
  );
}
