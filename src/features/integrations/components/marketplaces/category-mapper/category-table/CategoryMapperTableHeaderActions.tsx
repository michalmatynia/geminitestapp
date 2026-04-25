import { Download, Link2, Monitor, Save, Server } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { SegmentedControl } from '@/shared/ui/forms-and-actions.public';
import type { GenericMapperHeaderActionsProps } from '@/shared/contracts/ui/api';
import type { TraderaCategoryFetchBrowserMode } from '@/shared/contracts/integrations/marketplace';

type CategoryMapperTableHeaderActionsProps = GenericMapperHeaderActionsProps & {
  onAutoMatchByName: () => void;
  autoMatchDisabled: boolean;
  showBrowserModeControl?: boolean;
  browserMode?: TraderaCategoryFetchBrowserMode;
  onBrowserModeChange?: (mode: TraderaCategoryFetchBrowserMode) => void;
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
    showBrowserModeControl = false,
    browserMode = 'headed',
    onBrowserModeChange,
  } = props;

  return (
    <div className='flex items-center gap-2'>
      {showBrowserModeControl && onBrowserModeChange ? (
        <SegmentedControl<TraderaCategoryFetchBrowserMode>
          ariaLabel='Tradera category fetch browser mode'
          size='xs'
          value={browserMode}
          onChange={onBrowserModeChange}
          options={[
            { value: 'headed', label: 'Headed', icon: Monitor },
            { value: 'headless', label: 'Headless', icon: Server },
          ]}
        />
      ) : null}

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
