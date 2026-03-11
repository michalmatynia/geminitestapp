import React from 'react';

import { AllegroSubpageScaffold } from './AllegroSubpageScaffold';

export default function AllegroParameterMappingPage(): React.JSX.Element {
  return (
    <AllegroSubpageScaffold
      title='Parameter Mapping'
      description='Define how product fields map to Allegro listing parameters.'
      emptyState={{
        title: 'Mapping rules',
        description: 'Parameter mapping rules will appear here.',
      }}
    />
  );
}
