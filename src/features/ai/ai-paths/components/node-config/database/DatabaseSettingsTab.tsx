'use client';

import type { DatabaseConfig } from '@/features/ai/ai-paths/lib';
import { DB_COLLECTION_OPTIONS } from '@/features/ai/ai-paths/lib';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Button, Input, Label, SelectSimple } from '@/shared/ui';

import { useDatabaseConstructorContext } from './DatabaseConstructorContext';
import { useAiPathConfig } from '../../AiPathConfigContext';

export function DatabaseSettingsTab(): React.JSX.Element | null {
  const { availablePorts, bundleKeys, operation } = useDatabaseConstructorContext();
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  if (!selectedNode) return null;
  const databaseConfig: DatabaseConfig =
    (selectedNode.config?.database as DatabaseConfig) ?? { operation: 'query' };
  const writeSource = databaseConfig.writeSource ?? 'bundle';
  const guard = databaseConfig.parameterInferenceGuard ?? {};
  const updateGuard = (patch: Partial<NonNullable<DatabaseConfig['parameterInferenceGuard']>>): void =>
    updateSelectedNodeConfig({
      database: { ...databaseConfig, parameterInferenceGuard: { ...guard, ...patch } },
    });

  return (
    <div className='space-y-4'>
      {operation === 'update' && !databaseConfig.useMongoActions && (
        <div className='space-y-4'>
          <div>
            <Label className='text-xs text-gray-400'>Write Mode</Label>
            <SelectSimple
              size='sm'
              value={databaseConfig.mode ?? 'replace'}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    mode: value as 'replace' | 'append',
                  },
                })
              }
              options={[
                { value: 'replace', label: 'Replace' },
                { value: 'append', label: 'Append' },
              ]}
              triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
            />
          </div>
        </div>
      )}

      {operation === 'insert' && !databaseConfig.useMongoActions && (
        <div className='space-y-4'>
          <div>
            <Label className='text-xs text-gray-400'>Collection Type</Label>
            <SelectSimple
              size='sm'
              value={databaseConfig.entityType ?? 'products'}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  database: { ...databaseConfig, entityType: value },
                })
              }
              options={DB_COLLECTION_OPTIONS.filter((opt: { value: string; label: string }): boolean => opt.value !== 'custom').map((option: { value: string; label: string }) => ({
                value: option.value,
                label: option.label
              }))}
              placeholder='Collection type'
              triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
            />
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Payload Source</Label>
            <SelectSimple
              size='sm'
              value={writeSource}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  database: { ...databaseConfig, writeSource: value },
                })
              }
              options={availablePorts.map((port: string) => ({
                value: port,
                label: formatPortLabel(port)
              }))}
              placeholder='Select payload input'
              triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
            />
            <p className='mt-2 text-[11px] text-gray-500'>
              The selected input should contain a JSON object. Bundle is recommended.
            </p>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Payload Path (optional)</Label>
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={databaseConfig.writeSourcePath ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    writeSourcePath: event.target.value,
                  },
                })
              }
              placeholder='payload.subset'
            />
            {writeSource === 'bundle' && bundleKeys.size > 0 && (
              <SelectSimple
                size='xs'
                value={databaseConfig.writeSourcePath ?? ''}
                onValueChange={(value: string): void =>
                  updateSelectedNodeConfig({
                    database: {
                      ...databaseConfig,
                      writeSourcePath: value,
                    },
                  })
                }
                options={Array.from(bundleKeys).map((key: string) => ({
                  value: key,
                  label: formatPortLabel(key)
                }))}
                placeholder='Pick bundle key'
                triggerClassName='mt-2 border-border bg-card/70 text-[10px] text-gray-200'
              />
            )}
            <p className='mt-2 text-[11px] text-gray-500'>
              Optional path inside the payload to use as the request body.
            </p>
          </div>
        </div>
      )}

      {operation === 'delete' && !databaseConfig.useMongoActions && (
        <div className='space-y-4'>
          <div>
            <Label className='text-xs text-gray-400'>Collection Type</Label>
            <SelectSimple
              size='sm'
              value={databaseConfig.entityType ?? 'products'}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  database: { ...databaseConfig, entityType: value },
                })
              }
              options={DB_COLLECTION_OPTIONS.filter((opt: { value: string; label: string }): boolean => opt.value !== 'custom').map((option: { value: string; label: string }) => ({
                value: option.value,
                label: option.label
              }))}
              placeholder='Collection type'
              triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
            />
          </div>
        </div>
      )}

      {operation === 'update' && (
        <div className='space-y-3 rounded-md border border-border bg-card/30 p-3'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs text-gray-400'>Parameter Inference Guard</Label>
            <Button
              type='button'
              className={`rounded border px-3 py-1 text-xs ${
                guard.enabled
                  ? 'border-violet-500/40 text-violet-300 hover:bg-violet-500/10'
                  : 'border-border text-gray-400 hover:bg-muted/50'
              }`}
              onClick={(): void => updateGuard({ enabled: !guard.enabled })}
            >
              {guard.enabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {guard.enabled && (
            <div className='space-y-3'>
              <div>
                <Label className='text-xs text-gray-500'>Target field path</Label>
                <Input
                  className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                  value={guard.targetPath ?? ''}
                  placeholder='parameters'
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    updateGuard({ targetPath: e.target.value || undefined })
                  }
                />
                <p className='mt-1 text-[11px] text-gray-500'>
                  The field in the database document to write inferred values into, e.g. <code className='text-gray-400'>parameters</code>.
                </p>
              </div>

              <div>
                <Label className='text-xs text-gray-500'>Definitions port</Label>
                <SelectSimple
                  size='sm'
                  value={guard.definitionsPort ?? 'result'}
                  onValueChange={(value: string): void => updateGuard({ definitionsPort: value })}
                  options={availablePorts.map((port: string) => ({
                    value: port,
                    label: formatPortLabel(port),
                  }))}
                  placeholder='Select port'
                  triggerClassName='mt-1 w-full border-border bg-card/70 text-sm text-white'
                />
                <p className='mt-1 text-[11px] text-gray-500'>
                  Input port that carries the parameter definitions (catalog template).
                </p>
              </div>

              <div>
                <Label className='text-xs text-gray-500'>Definitions path (optional)</Label>
                <Input
                  className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                  value={guard.definitionsPath ?? ''}
                  placeholder='e.g. definitions or data.items'
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    updateGuard({ definitionsPath: e.target.value || undefined })
                  }
                />
              </div>

              <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
                <span>Enforce option labels</span>
                <Button
                  type='button'
                  className={`rounded border px-3 py-1 text-xs ${
                    guard.enforceOptionLabels
                      ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                      : 'border-border text-gray-400 hover:bg-muted/50'
                  }`}
                  onClick={(): void =>
                    updateGuard({ enforceOptionLabels: !guard.enforceOptionLabels })
                  }
                >
                  {guard.enforceOptionLabels ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
                <span>Allow unknown parameter IDs</span>
                <Button
                  type='button'
                  className={`rounded border px-3 py-1 text-xs ${
                    guard.allowUnknownParameterIds
                      ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                      : 'border-border text-gray-400 hover:bg-muted/50'
                  }`}
                  onClick={(): void =>
                    updateGuard({ allowUnknownParameterIds: !guard.allowUnknownParameterIds })
                  }
                >
                  {guard.allowUnknownParameterIds ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
