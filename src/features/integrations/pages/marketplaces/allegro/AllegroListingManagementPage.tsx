import React from 'react';

import { AllegroSubpageScaffold } from './AllegroSubpageScaffold';

export default function AllegroListingManagementPage(): React.JSX.Element {
  return (
    <AllegroSubpageScaffold
      title='Listing Management'
      description='Track listing status, syncs, and actions for Allegro.'
      emptyState={{
        title: 'No listings',
        description: 'Listing management controls will appear here.',
      }}
    />
  );
}
