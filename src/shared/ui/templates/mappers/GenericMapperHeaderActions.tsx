import { Download, Save } from 'lucide-react';
import React from 'react';

import type { GenericMapperHeaderActionsProps } from '@/shared/contracts/ui/ui/api';
import { Button } from '../../button';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '../../layout';

export type { GenericMapperHeaderActionsProps };

export function GenericMapperHeaderActions(
  props: GenericMapperHeaderActionsProps
): React.JSX.Element {
  const { onFetch, isFetching, onSave, isSaving, pendingCount } = props;

  return (
    <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
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
