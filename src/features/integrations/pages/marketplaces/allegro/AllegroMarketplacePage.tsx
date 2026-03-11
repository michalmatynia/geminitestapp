import React from 'react';

import {
  AdminIntegrationsPageLayout,
  NavigationCard,
  NavigationCardGrid,
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
    <AdminIntegrationsPageLayout
      title='Allegro'
      current='Allegro'
      parent={{ label: 'Marketplaces', href: '/admin/integrations/marketplaces' }}
      description='Configure Allegro integrations and listing workflows.'
    >
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
    </AdminIntegrationsPageLayout>
  );
}
