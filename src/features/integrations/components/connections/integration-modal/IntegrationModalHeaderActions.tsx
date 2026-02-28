import React from 'react';

import { Button } from '@/shared/ui';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalHeaderActions(): React.JSX.Element | null {
  const { activeTab, onSavePlaywrightSettings } = useIntegrationModalViewContext();

  if (activeTab !== 'playwright') {
    return null;
  }

  return (
    <Button variant='default' onClick={onSavePlaywrightSettings} className='min-w-[100px]'>
      Save
    </Button>
  );
}
