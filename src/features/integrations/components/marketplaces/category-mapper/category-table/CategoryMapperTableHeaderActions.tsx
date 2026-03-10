import { Download, Save } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui';
import type { GenericMapperHeaderActionsProps as CategoryMapperTableHeaderActionsProps } from '@/shared/ui/templates/mappers/GenericMapperHeaderActions';

export type { CategoryMapperTableHeaderActionsProps };

export function CategoryMapperTableHeaderActions(
  props: CategoryMapperTableHeaderActionsProps
): React.JSX.Element {
  const { onFetch, isFetching, onSave, isSaving, pendingCount } = props;

  return (
    <div className='flex items-center gap-2'>
      <Button variant='outline' size='xs' className='h-8' onClick={onFetch} loading={isFetching}>
        <Download className='mr-2 h-3.5 w-3.5' />
        Fetch Categories
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
