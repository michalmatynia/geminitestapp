import React from 'react';

import { SocialCaptureBrowserPanel } from '../SocialCaptureBrowserPanel';

export function SocialSettingsContentBrowserTab(): React.JSX.Element {
  return (
    <div className='space-y-3'>
      <div>
        <h3 className='text-sm font-medium text-foreground'>Content browser</h3>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Browse lessons by section and choose which page areas to capture for each slide.
        </p>
      </div>
      <SocialCaptureBrowserPanel />
    </div>
  );
}
