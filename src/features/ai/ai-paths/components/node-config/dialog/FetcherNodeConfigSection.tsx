'use client';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { DB_COLLECTION_OPTIONS } from '@/shared/lib/ai-paths';
import { Card, Input, SelectSimple, FormField } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

type FetcherSourceMode = 'live_context' | 'simulation_id' | 'live_then_simulation';

const FETCHER_SOURCE_OPTIONS: Array<LabeledOptionDto<FetcherSourceMode>> = [
  {
    value: 'live_context',
    label: 'Live trigger context',
  },
  {
    value: 'simulation_id',
    label: 'Simulated entity by ID',
  },
  {
    value: 'live_then_simulation',
    label: 'Live then simulated fallback',
  },
];

export function FetcherNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'fetcher') return null;

  const fetcherConfig = selectedNode.config?.fetcher ?? {
    sourceMode: 'live_context',
    entityType: 'product',
    entityId: '',
    productId: '',
  };

  const sourceMode: FetcherSourceMode = fetcherConfig.sourceMode ?? 'live_context';
  const entityId = fetcherConfig.entityId?.trim()
    ? fetcherConfig.entityId
    : (fetcherConfig.productId ?? '');
  const needsSimulationTarget =
    sourceMode === 'simulation_id' || sourceMode === 'live_then_simulation';

  const collectionOptions = DB_COLLECTION_OPTIONS.filter(
    (opt: LabeledOptionDto<string>): boolean => opt.value !== 'custom'
  ).map((opt: LabeledOptionDto<string>) => ({
    value: opt.value,
    label: opt.label,
  }));

  return (
    <div className='space-y-4'>
      <FormField label='Source Mode'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={sourceMode}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              fetcher: {
                ...fetcherConfig,
                sourceMode: value as FetcherSourceMode,
              },
            })
          }
          options={FETCHER_SOURCE_OPTIONS}
          placeholder='Select source mode'
         ariaLabel='Select source mode' title='Select source mode'/>
      </FormField>

      {needsSimulationTarget ? (
        <>
          <FormField label='Collection Type'>
            <SelectSimple
              size='sm'
              variant='subtle'
              value={fetcherConfig.entityType ?? 'products'}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  fetcher: {
                    ...fetcherConfig,
                    entityType: value,
                  },
                })
              }
              options={collectionOptions}
              placeholder='Select collection'
             ariaLabel='Select collection' title='Select collection'/>
          </FormField>
          <FormField label='Document ID'>
            <Input
              variant='subtle'
              size='sm'
              value={entityId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateSelectedNodeConfig({
                  fetcher: {
                    ...fetcherConfig,
                    entityId: event.target.value,
                    productId: event.target.value,
                  },
                })
              }
             aria-label='Document ID' title='Document ID'/>
          </FormField>
        </>
      ) : null}

      <Card variant='subtle' padding='sm' className='text-[11px] text-slate-200/80'>
        Connect `Trigger.trigger` to `Fetcher.trigger`, then connect `Fetcher.context` to `Context
        Filter.context`.
      </Card>
    </div>
  );
}
