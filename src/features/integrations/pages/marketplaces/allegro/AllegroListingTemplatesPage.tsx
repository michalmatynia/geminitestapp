import React from 'react';

import { AllegroSubpageScaffold } from './AllegroSubpageScaffold';

export default function AllegroListingTemplatesPage(): React.JSX.Element {
  return (
    <AllegroSubpageScaffold
      title='Listing Templates'
      description='Build reusable listing templates for Allegro.'
      emptyState={{
        title: 'No templates',
        description: 'Listing templates will appear here.',
      }}
    />
  );
}
