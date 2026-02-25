'use client';

import React from 'react';
import { Download, Save } from 'lucide-react';
import { Button } from '@/shared/ui';

export type CategoryMapperTableHeaderActionsProps = {
  onFetch: () => void;
  isFetching: boolean;
  onSave: () => void;
  isSaving: boolean;
  pendingCount: number;
};

export function CategoryMapperTableHeaderActions({
  onFetch,
  isFetching,
  onSave,
  isSaving,
  pendingCount,
}: CategoryMapperTableHeaderActionsProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='xs'
        className='h-8'
        onClick={onFetch}
        loading={isFetching}
      >
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
