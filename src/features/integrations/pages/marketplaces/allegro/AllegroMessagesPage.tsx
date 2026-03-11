import React from 'react';

import { AllegroSubpageScaffold } from './AllegroSubpageScaffold';

export default function AllegroMessagesPage(): React.JSX.Element {
  return (
    <AllegroSubpageScaffold
      title='Messages'
      description='View Allegro buyer messages and inquiries.'
      emptyState={{
        title: 'No messages',
        description: 'Messaging tools will appear here.',
      }}
    />
  );
}
