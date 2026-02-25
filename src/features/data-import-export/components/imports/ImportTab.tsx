'use client';

import React from 'react';
import { ImportBaseConnectionSection } from './sections/ImportBaseConnectionSection';
import { ImportListPreviewSection } from './sections/ImportListPreviewSection';
import { ImportRunStatusSection } from './sections/ImportRunStatusSection';
import { ImportLastResultSection } from './sections/ImportLastResultSection';

export function ImportTab(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <ImportBaseConnectionSection />
      <ImportListPreviewSection />
      <ImportRunStatusSection />
      <ImportLastResultSection />
    </div>
  );
}
