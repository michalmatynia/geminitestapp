import React from 'react';

import { Button } from '@/shared/ui';

type IntegrationModalHeaderActionsProps = {
  activeTab: string;
  onSave: () => void;
};

export function IntegrationModalHeaderActions({
  activeTab,
  onSave,
}: IntegrationModalHeaderActionsProps): React.JSX.Element | null {
  if (activeTab !== 'playwright') {
    return null;
  }

  return (
    <Button
      variant='primary'
      onClick={onSave}
      className='min-w-[100px]'
    >
      Save
    </Button>
  );
}
