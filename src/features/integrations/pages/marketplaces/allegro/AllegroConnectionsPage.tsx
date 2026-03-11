import React from 'react';

import { AllegroSubpageScaffold } from './AllegroSubpageScaffold';

export default function AllegroConnectionsPage(): React.JSX.Element {
  return (
    <AllegroSubpageScaffold
      title='Connections'
      description='Manage Allegro accounts, credentials, and sync settings.'
      emptyState={{
        title: 'Setup required',
        description: 'Connection setup will appear here.',
      }}
    />
  );
}
