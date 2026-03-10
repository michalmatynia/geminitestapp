import React from 'react';

import { GenerationToolbarProvider } from './generation-toolbar/GenerationToolbarContext';
import { GenerationToolbarInner } from './generation-toolbar/GenerationToolbarInner';

export function GenerationToolbar(): React.JSX.Element {
  return (
    <GenerationToolbarProvider>
      <GenerationToolbarInner />
    </GenerationToolbarProvider>
  );
}
