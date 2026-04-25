import { Download, Link2, Save } from 'lucide-react';
import React from 'react';

import type { TraderaCategoryFetchMethod } from '@/shared/contracts/integrations/marketplace';
import { Button } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import type { GenericMapperHeaderActionsProps } from '@/shared/contracts/ui/api';

const TRADERA_FETCH_METHOD_OPTIONS: { value: TraderaCategoryFetchMethod; label: string }[] = [
  { value: 'playwright_listing_form', label: 'Listing form picker' },
];

type CategoryMapperTableHeaderActionsProps = GenericMapperHeaderActionsProps & {
  onAutoMatchByName: () => void;
  autoMatchDisabled: boolean;
  /** When set, shows the Tradera fetch method dropdown */
  categoryFetchMethod?: TraderaCategoryFetchMethod | undefined;
  onCategoryFetchMethodChange?: ((method: TraderaCategoryFetchMethod) => void) | undefined;
  categoryFetchMethodOptions?:
    | { value: TraderaCategoryFetchMethod; label: string }[]
    | undefined;
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
    categoryFetchMethod,
    onCategoryFetchMethodChange,
    categoryFetchMethodOptions,
  } = props;

  const fetchMethodOptions = categoryFetchMethodOptions ?? TRADERA_FETCH_METHOD_OPTIONS;
  const showFetchMethodSelector =
    categoryFetchMethod !== undefined &&
    onCategoryFetchMethodChange !== undefined &&
    fetchMethodOptions.length > 1;

  return (
    <div className='flex items-center gap-2'>
      {showFetchMethodSelector ? (
        <div className='w-[200px]'>
          <SelectSimple
            size='sm'
            value={categoryFetchMethod}
            onValueChange={(v) => onCategoryFetchMethodChange(v as TraderaCategoryFetchMethod)}
            options={fetchMethodOptions}
            disabled={isFetching}
            ariaLabel='Category fetch method'
            title='Category fetch method'
          />
        </div>
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
