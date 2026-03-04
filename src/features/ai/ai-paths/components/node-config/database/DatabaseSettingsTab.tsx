'use client';

import { useCallback, useEffect } from 'react';

import type { DatabaseConfig } from '@/shared/lib/ai-paths';
import { DB_COLLECTION_OPTIONS } from '@/shared/lib/ai-paths';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Button, Input, Label, SelectSimple, FormField } from '@/shared/ui';

import { useDatabaseConstructorContext } from './DatabaseConstructorContext';
import { useAiPathConfig } from '../../AiPathConfigContext';

const CANONICAL_PARAMETER_INFERENCE_TARGET_PATH = 'parameters';

const normalizeParameterInferenceTargetPath = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed === CANONICAL_PARAMETER_INFERENCE_TARGET_PATH
    ? trimmed
    : CANONICAL_PARAMETER_INFERENCE_TARGET_PATH;
};

export function DatabaseSettingsTab(): React.JSX.Element | null {
  const { availablePorts, bundleKeys, operation } = useDatabaseConstructorContext();
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  if (!selectedNode) return null;
  const databaseConfig: DatabaseConfig = (selectedNode.config?.database as DatabaseConfig) ?? {
    operation: 'query',
  };
  const writeSource = databaseConfig.writeSource ?? 'bundle';
  const onZeroAffectedPolicy = databaseConfig.writeOutcomePolicy?.onZeroAffected ?? 'fail';
  const guard = databaseConfig.parameterInferenceGuard ?? {};
  const updateGuard = useCallback(
    (patch: Partial<NonNullable<DatabaseConfig['parameterInferenceGuard']>>): void => {
      const nextTargetPath = normalizeParameterInferenceTargetPath(patch.targetPath);
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          parameterInferenceGuard: {
            ...guard,
            ...patch,
            ...(patch.targetPath !== undefined ? { targetPath: nextTargetPath } : {}),
          },
        },
      });
    },
    [databaseConfig, guard, updateSelectedNodeConfig]
  );
  const normalizedGuardTargetPath = normalizeParameterInferenceTargetPath(guard.targetPath);

  useEffect((): void => {
    if (!guard.enabled) return;
    if (normalizedGuardTargetPath === CANONICAL_PARAMETER_INFERENCE_TARGET_PATH) return;
    updateGuard({ targetPath: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH });
  }, [guard.enabled, normalizedGuardTargetPath, updateGuard]);

  return (
    <div className='space-y-4'>
      {operation === 'update' && !databaseConfig.useMongoActions && (
        <FormField label='Write Mode'>
          <SelectSimple
            size='sm'
            variant='subtle'
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
          />
        </FormField>
      )}

      {operation === 'insert' && !databaseConfig.useMongoActions && (
        <div className='space-y-4'>
          <FormField label='Collection Type'>
            <SelectSimple
              size='sm'
              variant='subtle'
              value={databaseConfig.entityType ?? 'products'}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  database: { ...databaseConfig, entityType: value },
                })
              }
              options={DB_COLLECTION_OPTIONS.filter(
                (opt: { value: string; label: string }): boolean => opt.value !== 'custom'
              ).map((option: { value: string; label: string }) => ({
                value: option.value,
                label: option.label,
              }))}
              placeholder='Collection type'
            />
          </FormField>

          <FormField
            label='Payload Source'
            description='The selected input should contain a JSON object. Bundle is recommended.'
          >
            <SelectSimple
              size='sm'
              variant='subtle'
              value={writeSource}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  database: { ...databaseConfig, writeSource: value },
                })
              }
              options={availablePorts.map((port: string) => ({
                value: port,
                label: formatPortLabel(port),
              }))}
              placeholder='Select payload input'
            />
          </FormField>

          <FormField
            label='Payload Path (optional)'
            description='Optional path inside the payload to use as the request body.'
          >
            <div className='space-y-2'>
              <Input
                variant='subtle'
                size='sm'
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
                  variant='subtle'
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
                    label: formatPortLabel(key),
                  }))}
                  placeholder='Pick bundle key'
                />
              )}
            </div>
          </FormField>
        </div>
      )}

      {operation === 'delete' && !databaseConfig.useMongoActions && (
        <FormField label='Collection Type'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={databaseConfig.entityType ?? 'products'}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                database: { ...databaseConfig, entityType: value },
              })
            }
            options={DB_COLLECTION_OPTIONS.filter(
              (opt: { value: string; label: string }): boolean => opt.value !== 'custom'
            ).map((option: { value: string; label: string }) => ({
              value: option.value,
              label: option.label,
            }))}
            placeholder='Collection type'
          />
        </FormField>
      )}

      {(operation === 'insert' || operation === 'update' || operation === 'delete') && (
        <FormField
          label='Write Outcome Policy'
          description='Controls behavior when a write executes successfully but changes no records.'
        >
          <SelectSimple
            size='sm'
            variant='subtle'
            value={onZeroAffectedPolicy}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  writeOutcomePolicy: {
                    onZeroAffected: value === 'warn' ? 'warn' : 'fail',
                  },
                },
              })
            }
            options={[
              { value: 'fail', label: 'Fail run when 0 records affected' },
              { value: 'warn', label: 'Warn only when 0 records affected' },
            ]}
          />
        </FormField>
      )}

      {operation === 'update' && (
        <div className='space-y-3 rounded-md border border-border bg-card/30 p-3'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs text-gray-400'>Parameter Inference Guard</Label>
            <Button
              type='button'
              variant={guard.enabled ? 'success' : 'default'}
              size='xs'
              onClick={(): void =>
                updateGuard(
                  guard.enabled
                    ? { enabled: false }
                    : {
                      enabled: true,
                      targetPath: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH,
                    }
                )
              }
            >
              {guard.enabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {guard.enabled && (
            <div className='space-y-3'>
              <FormField
                label='Target field path'
                description='The field in the database document to write inferred values into, e.g. parameters.'
              >
                <Input
                  variant='subtle'
                  size='sm'
                  value={normalizedGuardTargetPath ?? CANONICAL_PARAMETER_INFERENCE_TARGET_PATH}
                  placeholder='parameters'
                  readOnly
                />
              </FormField>

              <FormField
                label='Definitions port'
                description='Input port that carries the parameter definitions (catalog template).'
              >
                <SelectSimple
                  size='sm'
                  variant='subtle'
                  value={guard.definitionsPort ?? 'result'}
                  onValueChange={(value: string): void => updateGuard({ definitionsPort: value })}
                  options={availablePorts.map((port: string) => ({
                    value: port,
                    label: formatPortLabel(port),
                  }))}
                  placeholder='Select port'
                />
              </FormField>

              <FormField label='Definitions path (optional)'>
                <Input
                  variant='subtle'
                  size='sm'
                  value={guard.definitionsPath ?? ''}
                  placeholder='e.g. definitions or data.items'
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    updateGuard({ definitionsPath: e.target.value || undefined })
                  }
                />
              </FormField>

              <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
                <span>Enforce option labels</span>
                <Button
                  type='button'
                  variant={guard.enforceOptionLabels ? 'success' : 'default'}
                  size='xs'
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
                  variant={guard.allowUnknownParameterIds ? 'success' : 'default'}
                  size='xs'
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
