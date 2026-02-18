'use client';

import type { DatabaseConfig } from '@/features/ai/ai-paths/lib';
import { DB_COLLECTION_OPTIONS } from '@/features/ai/ai-paths/lib';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Input, Label, SelectSimple } from '@/shared/ui';

import { useDatabaseConstructorContext } from './DatabaseConstructorContext';
import { useAiPathConfig } from '../../AiPathConfigContext';

export function DatabaseSettingsTab(): React.JSX.Element | null {
  const { availablePorts, bundleKeys, operation } = useDatabaseConstructorContext();
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  if (!selectedNode) return null;
  const databaseConfig: DatabaseConfig =
    (selectedNode.config?.database as DatabaseConfig) ?? { operation: 'query' };
  const writeSource = databaseConfig.writeSource ?? 'bundle';

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
    </div>
  );
}
