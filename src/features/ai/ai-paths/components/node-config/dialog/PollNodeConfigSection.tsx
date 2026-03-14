'use client';

import type { DbQueryConfig, Edge, PollConfig } from '@/shared/lib/ai-paths';
import { DB_COLLECTION_OPTIONS, renderTemplate, toNumber } from '@/shared/lib/ai-paths';
import { Button, Input, Textarea, SelectSimple, FormField } from '@/shared/ui';

import {
  useAiPathGraph,
  useAiPathOrchestrator,
  useAiPathRuntime,
  useAiPathSelection,
} from '../../AiPathConfigContext';

export function PollNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { edges } = useAiPathGraph();
  const { runtimeState } = useAiPathRuntime();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'poll') return null;

  const defaultQuery: DbQueryConfig = {
    provider: 'auto',
    collection: 'products',
    mode: 'preset',
    preset: 'by_id',
    field: '_id',
    idType: 'string',
    queryTemplate: '{\n  "_id": "{{value}}"\n}',
    limit: 20,
    sort: '',
    projection: '',
    single: false,
  };
  const pollConfig = selectedNode.config?.poll;
  const resolvedPollConfig: PollConfig = {
    intervalMs: pollConfig?.intervalMs ?? 2000,
    maxAttempts: pollConfig?.maxAttempts ?? 30,
    mode: pollConfig?.mode ?? 'job',
    dbQuery: {
      ...defaultQuery,
      ...(pollConfig?.dbQuery ?? {}),
    } as DbQueryConfig,
    successPath: pollConfig?.successPath ?? 'status',
    successOperator: pollConfig?.successOperator ?? 'equals',
    successValue: pollConfig?.successValue ?? 'completed',
    resultPath: pollConfig?.resultPath ?? 'result',
  };
  const queryConfig: DbQueryConfig = {
    ...resolvedPollConfig.dbQuery!,
    provider: resolvedPollConfig.dbQuery?.provider === 'mongodb' ? 'mongodb' : 'auto',
  };
  const collectionOption = DB_COLLECTION_OPTIONS.some(
    (option: { label: string; value: string }) => option.value === queryConfig.collection
  )
    ? queryConfig.collection
    : 'custom';
  const updatePollConfig = (patch: Partial<PollConfig>): void =>
    updateSelectedNodeConfig({
      poll: {
        ...resolvedPollConfig,
        ...patch,
      },
    });

  const connections = edges.filter((edge: Edge): boolean => edge.to === selectedNode.id);
  const resolvedRuntimeInputs = selectedNode.inputs.reduce<Record<string, unknown>>(
    (acc: Record<string, unknown>, input: string): Record<string, unknown> => {
      const runtimeInputs = runtimeState.inputs?.[selectedNode.id] ?? {};
      const directValue = runtimeInputs[input];
      if (directValue !== undefined) {
        acc[input] = directValue;
        return acc;
      }
      const matchingEdges = connections.filter(
        (edge: Edge): boolean => edge.toPort === input || !edge.toPort
      );
      const merged = matchingEdges.reduce<unknown>((current: unknown, edge: Edge): unknown => {
        const fromNodeId = edge.from;
        if (!fromNodeId) return current;
        const fromOutput = runtimeState.outputs?.[fromNodeId];
        if (!fromOutput) return current;
        const fromPort = edge.fromPort;
        if (!fromPort) return current;
        const value = fromOutput[fromPort];
        if (value === undefined) return current;
        if (current === undefined) return value;
        if (Array.isArray(current)) return [...(current as unknown[]), value];
        return [current, value];
      }, undefined);
      if (merged !== undefined) {
        acc[input] = merged;
      }
      return acc;
    },
    {}
  );
  const inputValue =
    (resolvedRuntimeInputs['value'] as string) ?? (resolvedRuntimeInputs['jobId'] as string) ?? '';
  const queryPreviewText = renderTemplate(
    queryConfig.queryTemplate ?? '{}',
    resolvedRuntimeInputs,
    inputValue
  );

  return (
    <div className='space-y-4'>
      <FormField label='Mode'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={resolvedPollConfig.mode || ''}
          onValueChange={(value: string): void =>
            updatePollConfig({ mode: value as 'job' | 'database' })
          }
          options={[
            { value: 'job', label: 'AI Job' },
            { value: 'database', label: 'Database Query' },
          ]}
          placeholder='Select mode'
         ariaLabel="Select mode" title="Select mode"/>
      </FormField>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Interval (ms)'>
          <Input
            type='number'
            step='100'
            variant='subtle'
            size='sm'
            value={resolvedPollConfig.intervalMs}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updatePollConfig({
                intervalMs: toNumber(event.target.value, resolvedPollConfig.intervalMs),
              })
            }
           aria-label="Interval (ms)" title="Interval (ms)"/>
        </FormField>
        <FormField label='Max Attempts'>
          <Input
            type='number'
            step='1'
            variant='subtle'
            size='sm'
            value={resolvedPollConfig.maxAttempts}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updatePollConfig({
                maxAttempts: toNumber(event.target.value, resolvedPollConfig.maxAttempts),
              })
            }
           aria-label="Max Attempts" title="Max Attempts"/>
        </FormField>
      </div>
      {resolvedPollConfig.mode === 'job' && (
        <p className='text-[11px] text-gray-500'>
          Polls /api/v2/products/ai-jobs/{'{{jobId}}'} until completion and outputs result + status.
        </p>
      )}
      {resolvedPollConfig.mode === 'database' && (
        <div className='space-y-4 pt-2 border-t border-border/20'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Provider'>
              <SelectSimple
                size='sm'
                variant='subtle'
                value={queryConfig.provider}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      provider: value as DbQueryConfig['provider'],
                    },
                  })
                }
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'mongodb', label: 'MongoDB' },
                ]}
                placeholder='Select provider'
               ariaLabel="Select provider" title="Select provider"/>
            </FormField>
            <FormField label='Collection'>
              <SelectSimple
                size='sm'
                variant='subtle'
                value={collectionOption}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      collection: value === 'custom' ? queryConfig.collection : value,
                    },
                  })
                }
                options={[
                  ...DB_COLLECTION_OPTIONS.map((option: { label: string; value: string }) => ({
                    value: option.value,
                    label: option.label,
                  })),
                  { value: 'custom', label: 'Custom' },
                ]}
                placeholder='Select collection'
               ariaLabel="Select collection" title="Select collection"/>
            </FormField>
          </div>
          {collectionOption === 'custom' && (
            <FormField label='Custom collection'>
              <Input
                variant='subtle'
                size='sm'
                value={queryConfig.collection}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      collection: event.target.value,
                    },
                  })
                }
               aria-label="Custom collection" title="Custom collection"/>
            </FormField>
          )}
          <div className='rounded-md border border-border bg-card/60 p-3'>
            <div className='text-[11px] text-gray-400 font-semibold uppercase tracking-wider'>
              Query preview
            </div>
            <pre className='mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200 font-mono'>
              {queryPreviewText}
            </pre>
            <p className='mt-2 text-[11px] text-gray-500'>
              Preview uses current runtime inputs (if available).
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Query mode'>
              <SelectSimple
                size='sm'
                variant='subtle'
                value={queryConfig.mode}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      mode: value as DbQueryConfig['mode'],
                    },
                  })
                }
                options={[
                  { value: 'preset', label: 'Preset' },
                  { value: 'custom', label: 'Custom' },
                ]}
                placeholder='Select mode'
               ariaLabel="Select mode" title="Select mode"/>
            </FormField>
            <FormField label='ID type'>
              <SelectSimple
                size='sm'
                variant='subtle'
                value={queryConfig.idType}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      idType: value as DbQueryConfig['idType'],
                    },
                  })
                }
                options={[
                  { value: 'string', label: 'String' },
                  { value: 'objectId', label: 'ObjectId' },
                ]}
                placeholder='Select ID type'
               ariaLabel="Select ID type" title="Select ID type"/>
            </FormField>
          </div>
          {queryConfig.mode === 'preset' && (
            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Preset'>
                <SelectSimple
                  size='sm'
                  variant='subtle'
                  value={queryConfig.preset}
                  onValueChange={(value: string): void =>
                    updatePollConfig({
                      dbQuery: {
                        ...queryConfig,
                        preset: value as DbQueryConfig['preset'],
                      },
                    })
                  }
                  options={[
                    { value: 'by_id', label: 'By _id' },
                    { value: 'by_productId', label: 'By productId' },
                    { value: 'by_entityId', label: 'By entityId' },
                    { value: 'by_field', label: 'By custom field' },
                  ]}
                  placeholder='Select preset'
                 ariaLabel="Select preset" title="Select preset"/>
              </FormField>
              <FormField label='Custom field'>
                <Input
                  variant='subtle'
                  size='sm'
                  value={queryConfig.field}
                  disabled={queryConfig.preset !== 'by_field'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    updatePollConfig({
                      dbQuery: {
                        ...queryConfig,
                        field: event.target.value,
                      },
                    })
                  }
                 aria-label="Custom field" title="Custom field"/>
              </FormField>
            </div>
          )}
          {queryConfig.mode === 'custom' && (
            <FormField
              label='Query template'
              description='Supports placeholders like {{value}}, {{entityId}}, {{jobId}}.'
            >
              <Textarea
                variant='subtle'
                size='sm'
                className='min-h-[120px]'
                value={queryConfig.queryTemplate}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      queryTemplate: event.target.value,
                    },
                  })
                }
               aria-label="Query template" title="Query template"/>
            </FormField>
          )}
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Limit'>
              <Input
                type='number'
                step='1'
                variant='subtle'
                size='sm'
                value={queryConfig.limit}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      limit: toNumber(event.target.value, queryConfig.limit),
                    },
                  })
                }
               aria-label="Limit" title="Limit"/>
            </FormField>
            <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
              <span>Single result</span>
              <Button
                type='button'
                variant={queryConfig.single ? 'success' : 'default'}
                size='xs'
                onClick={(): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      single: !queryConfig.single,
                    },
                  })
                }
              >
                {queryConfig.single ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Sort JSON'>
              <Textarea
                variant='subtle'
                size='sm'
                className='min-h-[80px] font-mono'
                value={queryConfig.sort}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      sort: event.target.value,
                    },
                  })
                }
               aria-label="Sort JSON" title="Sort JSON"/>
            </FormField>
            <FormField label='Projection JSON'>
              <Textarea
                variant='subtle'
                size='sm'
                className='min-h-[80px] font-mono'
                value={queryConfig.projection}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      projection: event.target.value,
                    },
                  })
                }
               aria-label="Projection JSON" title="Projection JSON"/>
            </FormField>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Success path'>
              <Input
                variant='subtle'
                size='sm'
                value={resolvedPollConfig.successPath}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({ successPath: event.target.value })
                }
               aria-label="Success path" title="Success path"/>
            </FormField>
            <FormField label='Success operator'>
              <SelectSimple
                size='sm'
                variant='subtle'
                value={resolvedPollConfig.successOperator ?? 'equals'}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    successOperator: value as 'truthy' | 'equals' | 'contains' | 'notEquals',
                  })
                }
                options={[
                  { value: 'truthy', label: 'Truthy' },
                  { value: 'equals', label: 'Equals' },
                  { value: 'notEquals', label: 'Not equals' },
                  { value: 'contains', label: 'Contains' },
                ]}
                placeholder='Select operator'
               ariaLabel="Select operator" title="Select operator"/>
            </FormField>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Success value'>
              <Input
                variant='subtle'
                size='sm'
                value={resolvedPollConfig.successValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({ successValue: event.target.value })
                }
               aria-label="Success value" title="Success value"/>
            </FormField>
            <FormField label='Result path'>
              <Input
                variant='subtle'
                size='sm'
                value={resolvedPollConfig.resultPath}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({ resultPath: event.target.value })
                }
               aria-label="Result path" title="Result path"/>
            </FormField>
          </div>
          <p className='text-[11px] text-gray-500'>
            Polls the selected provider using the query settings. Use Success path/value to stop
            polling when a record matches.
          </p>
        </div>
      )}
    </div>
  );
}
