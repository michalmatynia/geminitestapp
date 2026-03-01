import React from 'react';
import { Download, Save } from 'lucide-react';
import { Button } from '../../button';

export type GenericMapperHeaderActionsProps = {
  onFetch: () => void;
  isFetching: boolean;
  onSave: () => void;
  isSaving: boolean;
  pendingCount: number;
};

export function GenericMapperHeaderActions({
  onFetch,
  isFetching,
  onSave,
  isSaving,
  pendingCount,
}: GenericMapperHeaderActionsProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-3'>
      <Button variant='outline' size='sm' onClick={onFetch} loading={isFetching}>
        <Download className='mr-2 h-3.5 w-3.5' />
        Fetch
      </Button>
      <Button size='sm' onClick={onSave} loading={isSaving} disabled={pendingCount === 0}>
        <Save className='mr-2 h-3.5 w-3.5' />
        Save {pendingCount > 0 ? `(${pendingCount})` : ''}
      </Button>
    </div>
  );
}
