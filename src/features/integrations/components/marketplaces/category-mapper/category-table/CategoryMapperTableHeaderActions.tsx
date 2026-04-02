import { Download, Link2, Save } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui';
import type { GenericMapperHeaderActionsProps } from '@/shared/contracts/ui';

type CategoryMapperTableHeaderActionsProps = GenericMapperHeaderActionsProps & {
  onAutoMatchByName: () => void;
  autoMatchDisabled: boolean;
};

export function CategoryMapperTableHeaderActions(
  props: CategoryMapperTableHeaderActionsProps
): React.JSX.Element {
  const {
    onFetch,
    isFetching,
    onAutoMatchByName,
    autoMatchDisabled,
    onSave,
    isSaving,
    pendingCount,
  } = props;

  return (
    <div className='flex items-center gap-2'>
      <Button variant='outline' size='xs' className='h-8' onClick={onFetch} loading={isFetching}>
        <Download className='mr-2 h-3.5 w-3.5' />
        Fetch Categories
      </Button>

      <Button
        variant='outline'
        size='xs'
        className='h-8'
        onClick={onAutoMatchByName}
        disabled={autoMatchDisabled}
      >
        <Link2 className='mr-2 h-3.5 w-3.5' />
        Auto-match Paths & Names
      </Button>

      <Button
        size='xs'
        className='h-8'
        onClick={onSave}
        loading={isSaving}
        disabled={pendingCount === 0}
      >
        <Save className='mr-2 h-3.5 w-3.5' />
        Save {pendingCount > 0 ? `(${pendingCount})` : ''}
      </Button>
    </div>
  );
}
