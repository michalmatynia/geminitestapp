'use client';

import React, { useMemo } from 'react';
import type { JSX } from 'react';
import { Badge } from '@/shared/ui/primitives.public';
import { FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { useDatabaseEngineActionsContext, useDatabaseEngineStateContext } from '../../context/DatabaseEngineContext';
import { type DatabaseCollectionRow } from '../../hooks/useDatabaseEngineState';
import { ColumnDef } from '@tanstack/react-table';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { type LabeledOptionDto } from '@/shared/contracts/base';
import type { DatabaseEngineProvider as DatabaseEngineProviderValue } from '@/shared/lib/db/database-engine-constants';

const COLLECTION_PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'auto' | DatabaseEngineProviderValue>>;

export function DatabaseEngineSettingsTab(): JSX.Element {
  const {
    policy,
    operationControls,
    collectionRouteMap,
    engineStatus,
  } = useDatabaseEngineStateContext();
  const {
    updatePolicy,
    updateCollectionRoute,
    updateOperationControls,
  } = useDatabaseEngineActionsContext();

  const collectionColumns = useMemo<ColumnDef<DatabaseCollectionRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Collection',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <span className='font-mono text-emerald-200 font-medium'>{row.original.name}</span>
            <Badge variant='outline'>{row.original.provider}</Badge>
          </div>
        ),
      },
      {
        id: 'provider',
        header: 'Assigned Provider',
        cell: ({ row }) => (
          <SelectSimple
            size='xs'
            value={collectionRouteMap[row.original.name] ?? 'auto'}
            onValueChange={(val) => updateCollectionRoute(row.original.name, val)}
            options={COLLECTION_PROVIDER_OPTIONS}
            className='h-7 w-28 text-[10px]'
            ariaLabel='Select option'
            title='Select option'
          />
        ),
      },
    ],
    [collectionRouteMap, updateCollectionRoute]
  );

  return (
    <div className='space-y-6'>
      <FormSection title='Engine Status'>
        <StatusBadge status={engineStatus} />
      </FormSection>

      <FormSection title='Operation Controls'>
        <ToggleRow
          label='Allow Manual Full Sync'
          checked={operationControls.allowManualFullSync}
          onCheckedChange={(checked) => updateOperationControls({ allowManualFullSync: checked })}
        />
      </FormSection>
      
      <FormSection title='Backup Policy'>
        <ToggleRow
          label='Enable Automated Backups'
          checked={policy.enabled}
          onCheckedChange={(checked) => updatePolicy({ enabled: checked })}
        />
      </FormSection>
    </div>
  );
}
