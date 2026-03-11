import React from 'react';

import { AllegroSubpageScaffold } from './AllegroSubpageScaffold';

export default function AllegroShippingPriceManagementPage(): React.JSX.Element {
  return (
    <AllegroSubpageScaffold
      title='Shipping Price Management'
      description='Configure shipping price rules and profiles for Allegro listings.'
      emptyState={{
        title: 'Shipping profiles',
        description: 'Shipping price rules will appear here.',
      }}
    />
  );
}
