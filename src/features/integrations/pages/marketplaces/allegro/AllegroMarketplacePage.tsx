import React from 'react';

import {
  NavigationCard,
  NavigationCardGrid,
  SectionHeader,
  SectionHeaderBackLink,
} from '@/shared/ui';

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
          <SectionHeaderBackLink href='/admin/integrations/marketplaces' arrow>
            Marketplaces
          </SectionHeaderBackLink>
        }
        className='mb-6'
      />

      <NavigationCardGrid className='md:grid-cols-2 xl:grid-cols-3'>
        {sections.map((section: { name: string; description: string; href: string }) => (
          <NavigationCard
            key={section.name}
            href={section.href}
            className='border-border/60 bg-card/40 hover:bg-muted/40'
            variant='outline'
            title={section.name}
            description={section.description}
          />
        ))}
      </NavigationCardGrid>
    </div>
  );
}
