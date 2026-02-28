import Link from 'next/link';
import React from 'react';

import { SectionHeader } from '@/shared/ui';

const sections = [
  {
    name: 'Categories Mapping',
    description: 'Map Allegro categories to local categories.',
    href: '/admin/integrations/marketplaces/allegro/categories',
  },
  {
    name: 'Parameters Mapping',
    description: 'Map Allegro parameters to product fields.',
    href: '/admin/integrations/marketplaces/allegro/parameters',
  },
];

export default function AllegroMarketplacePage(): React.JSX.Element {
  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Allegro'
        description='Configure Allegro integrations and listing workflows.'
        eyebrow={
          <Link
            href='/admin/integrations/marketplaces'
            className='text-blue-300 hover:text-blue-200'
          >
            ← Marketplaces
          </Link>
        }
        className='mb-6'
      />

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {sections.map((section: { name: string; description: string; href: string }) => (
          <Link
            key={section.name}
            href={section.href}
            className='rounded-md border border-border/60 bg-card/40 p-4 transition hover:bg-muted/40'
          >
            <h2 className='text-lg font-semibold text-white'>{section.name}</h2>
            <p className='mt-1 text-sm text-gray-400'>{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
