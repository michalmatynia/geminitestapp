'use client';

import React, { useCallback, useEffect } from 'react';

import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { DatabaseConfig } from '@/shared/lib/ai-paths';
import { DB_COLLECTION_OPTIONS } from '@/shared/lib/ai-paths';
import { Button, Input, Label } from '@/shared/ui/primitives.public';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';
import { insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  useDatabaseConstructorActionsContext,
  useDatabaseConstructorStateContext,
} from './DatabaseConstructorContext';
import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const CANONICAL_PARAMETER_INFERENCE_TARGET_PATH = 'parameters';
const CANONICAL_LOCALIZED_PARAMETER_MERGE_TARGET_PATH = 'parameters';

const WRITE_MODE_OPTIONS = [
  { value: 'replace', label: 'Replace' },
  { value: 'append', label: 'Append' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'replace' | 'append'>>;

const UPDATE_PAYLOAD_MODE_OPTIONS = [
  { value: 'custom', label: 'Custom Template' },
  { value: 'mapping', label: 'Field Mapping' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'custom' | 'mapping'>>;

const WRITE_OUTCOME_POLICY_OPTIONS = [
  { value: 'fail', label: 'Fail run when 0 records affected' },
  { value: 'warn', label: 'Warn only when 0 records affected' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'fail' | 'warn'>>;

const DB_COLLECTION_SELECT_OPTIONS = DB_COLLECTION_OPTIONS.filter(
  (opt: LabeledOptionDto<string>): boolean => opt.value !== 'custom'
);

const normalizeParameterInferenceTargetPath = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed === CANONICAL_PARAMETER_INFERENCE_TARGET_PATH
    ? trimmed
    : CANONICAL_PARAMETER_INFERENCE_TARGET_PATH;
};

const normalizeLocalizedParameterMergeTargetPath = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed === CANONICAL_LOCALIZED_PARAMETER_MERGE_TARGET_PATH
    ? trimmed
    : CANONICAL_LOCALIZED_PARAMETER_MERGE_TARGET_PATH;
};

type DatabaseSettingsSectionProps = {
  children: React.ReactNode;
  className?: string;
};

function DatabaseSettingsSection({
  children,
  className,
}: DatabaseSettingsSectionProps): React.JSX.Element {
  return (
    <div
      className={cn(
        insetPanelVariants({ radius: 'compact', padding: 'sm' }),
        'space-y-3 border-border bg-card/30',
        className
      )}
    >
      {children}
    </div>
  );
}

export function DatabaseSettingsTab(): React.JSX.Element | null {
  const { availablePorts, bundleKeys, mappings, uniqueTargetPathOptions, operation } =
    useDatabaseConstructorStateContext();
  const availablePortOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> =>
      availablePorts.map((port: string) => ({
        value: port,
        label: formatPortLabel(port),
      })),
    [availablePorts]
  );
  const bundleKeyOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> =>
      Array.from(bundleKeys).map((key: string) => ({
        value: key,
        label: formatPortLabel(key),
      })),
    [bundleKeys]
  );
  const { updateMapping, removeMapping, addMapping, mapInputsToTargets } =
    useDatabaseConstructorActionsContext();
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  if (!selectedNode) return null;
  const databaseConfig: DatabaseConfig = (selectedNode.config?.database as DatabaseConfig) ?? {
    operation: 'query',
  };
  const writeSource = databaseConfig.writeSource ?? 'bundle';
  const onZeroAffectedPolicy = databaseConfig.writeOutcomePolicy?.onZeroAffected ?? 'fail';
  const updatePayloadMode = databaseConfig.updatePayloadMode === 'mapping' ? 'mapping' : 'custom';
  const targetPathSuggestions = uniqueTargetPathOptions.map((entry) => entry.value);
  const targetPathDatalistId = `database-target-paths-${selectedNode.id}`;
  const guard = databaseConfig.parameterInferenceGuard ?? {};
  const localizedMerge = databaseConfig.localizedParameterMerge ?? {};
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
  const updateLocalizedMerge = useCallback(
    (patch: Partial<NonNullable<DatabaseConfig['localizedParameterMerge']>>): void => {
      const nextTargetPath = normalizeLocalizedParameterMergeTargetPath(patch.targetPath);
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          localizedParameterMerge: {
            ...localizedMerge,
            ...patch,
            ...(patch.targetPath !== undefined ? { targetPath: nextTargetPath } : {}),
          },
        },
      });
    },
    [databaseConfig, localizedMerge, updateSelectedNodeConfig]
  );
  const normalizedGuardTargetPath = normalizeParameterInferenceTargetPath(guard.targetPath);
  const normalizedLocalizedMergeTargetPath = normalizeLocalizedParameterMergeTargetPath(
    localizedMerge.targetPath
  );

  useEffect((): void => {
    if (!guard.enabled) return;
    if (normalizedGuardTargetPath === CANONICAL_PARAMETER_INFERENCE_TARGET_PATH) return;
    updateGuard({ targetPath: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH });
  }, [guard.enabled, normalizedGuardTargetPath, updateGuard]);

  useEffect((): void => {
    if (!localizedMerge.enabled) return;
    if (
      normalizedLocalizedMergeTargetPath === CANONICAL_LOCALIZED_PARAMETER_MERGE_TARGET_PATH
    ) {
      return;
    }
    updateLocalizedMerge({ targetPath: CANONICAL_LOCALIZED_PARAMETER_MERGE_TARGET_PATH });
  }, [localizedMerge.enabled, normalizedLocalizedMergeTargetPath, updateLocalizedMerge]);

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
            options={WRITE_MODE_OPTIONS}
           ariaLabel='Write Mode' title='Write Mode'/>
        </FormField>
      )}

      {operation === 'update' && (
        <DatabaseSettingsSection>
          <FormField
            label='Update Payload Mode'
            description='Custom mode uses the update template. Mapping mode writes fields from explicit source ports and paths.'
          >
            <SelectSimple
              size='sm'
              variant='subtle'
              value={updatePayloadMode}
              onValueChange={(value: string): void =>
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    updatePayloadMode: value === 'mapping' ? 'mapping' : 'custom',
                  },
                })
              }
              options={UPDATE_PAYLOAD_MODE_OPTIONS}
             ariaLabel='Update Payload Mode' title='Update Payload Mode'/>
          </FormField>

          {updatePayloadMode === 'mapping' && (
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <Button type='button' variant='outline' size='xs' onClick={addMapping}>
                  Add Mapping
                </Button>
                <Button type='button' variant='outline' size='xs' onClick={mapInputsToTargets}>
                  Auto-map Inputs
                </Button>
              </div>

              {mappings.length === 0 ? (
                <p className='text-xs text-gray-400'>
                  No mappings configured. Add at least one mapping to write updates.
                </p>
              ) : (
                <div className='space-y-2'>
                  {mappings.map((mapping, index) => (
                    <div
                      key={`${mapping.targetPath}:${mapping.sourcePort}:${index}`}
                      className='grid gap-2 rounded-md border border-border bg-card/50 p-2 md:grid-cols-[1fr_180px_1fr_auto]'
                    >
                      <Input
                        variant='subtle'
                        size='sm'
                        list={targetPathDatalistId}
                        value={mapping.targetPath ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateMapping(index, { targetPath: event.target.value })
                        }
                        aria-label='Target path'
                        placeholder='Target path (e.g. description_pl)'
                       title='Target path (e.g. description_pl)'/>
                      <SelectSimple
                        size='sm'
                        variant='subtle'
                        value={mapping.sourcePort ?? availablePorts[0] ?? 'value'}
                        onValueChange={(value: string): void =>
                          updateMapping(index, { sourcePort: value })
                        }
                        ariaLabel='Source port'
                        options={availablePortOptions}
                        placeholder='Source port'
                       title='Source port'/>
                      <Input
                        variant='subtle'
                        size='sm'
                        value={mapping.sourcePath ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateMapping(index, { sourcePath: event.target.value })
                        }
                        aria-label='Source path'
                        placeholder='Source path (optional)'
                       title='Source path (optional)'/>
                      <Button
                        type='button'
                        variant='outline'
                        size='xs'
                        onClick={(): void => removeMapping(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {targetPathSuggestions.length > 0 && (
                <datalist id={targetPathDatalistId}>
                  {targetPathSuggestions.map((path) => (
                    <option key={path} value={path} aria-label={path} />
                  ))}
                </datalist>
              )}
            </div>
          )}
        </DatabaseSettingsSection>
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
              options={DB_COLLECTION_SELECT_OPTIONS}
              placeholder='Collection type'
              ariaLabel='Collection type'
              title='Collection type'
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
              options={availablePortOptions}
              placeholder='Select payload input'
             ariaLabel='Select payload input' title='Select payload input'/>
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
               aria-label='payload.subset' title='payload.subset'/>
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
                  options={bundleKeyOptions}
                  placeholder='Pick bundle key'
                 ariaLabel='Pick bundle key' title='Pick bundle key'/>
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
            options={DB_COLLECTION_SELECT_OPTIONS}
            placeholder='Collection type'
            ariaLabel='Collection type'
            title='Collection type'
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
            options={WRITE_OUTCOME_POLICY_OPTIONS}
           ariaLabel='Write Outcome Policy' title='Write Outcome Policy'/>
        </FormField>
      )}

      {operation === 'update' && (
        <DatabaseSettingsSection>
          <Label className='text-xs text-gray-400'>Write Value Policies</Label>

          <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
            <span>Trim strings before write</span>
            <Button
              type='button'
              variant={databaseConfig.trimStrings ? 'success' : 'default'}
              size='xs'
              onClick={(): void =>
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    trimStrings: !databaseConfig.trimStrings,
                  },
                })
              }
            >
              {databaseConfig.trimStrings ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
            <span>Skip empty top-level writes</span>
            <Button
              type='button'
              variant={databaseConfig.skipEmpty ? 'success' : 'default'}
              size='xs'
              onClick={(): void =>
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    skipEmpty: !databaseConfig.skipEmpty,
                  },
                })
              }
            >
              {databaseConfig.skipEmpty ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </DatabaseSettingsSection>
      )}

      {operation === 'update' && (
        <DatabaseSettingsSection>
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
                 aria-label='parameters' title='parameters'/>
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
                  options={availablePortOptions}
                  placeholder='Select port'
                 ariaLabel='Select port' title='Select port'/>
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
                 aria-label='e.g. definitions or data.items' title='e.g. definitions or data.items'/>
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
        </DatabaseSettingsSection>
      )}

      {operation === 'update' && (
        <DatabaseSettingsSection>
          <div className='flex items-center justify-between'>
            <Label className='text-xs text-gray-400'>Localized Parameter Merge</Label>
            <Button
              type='button'
              variant={localizedMerge.enabled ? 'success' : 'default'}
              size='xs'
              onClick={(): void =>
                updateLocalizedMerge(
                  localizedMerge.enabled
                    ? { enabled: false }
                    : {
                        enabled: true,
                        targetPath: CANONICAL_LOCALIZED_PARAMETER_MERGE_TARGET_PATH,
                      }
                )
              }
            >
              {localizedMerge.enabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {localizedMerge.enabled && (
            <div className='space-y-3'>
              <FormField
                label='Target field path'
                description='The array field whose localized values should merge into existing records.'
              >
                <Input
                  variant='subtle'
                  size='sm'
                  value={
                    normalizedLocalizedMergeTargetPath ??
                    CANONICAL_LOCALIZED_PARAMETER_MERGE_TARGET_PATH
                  }
                  placeholder='parameters'
                  readOnly
                 aria-label='parameters' title='parameters'/>
              </FormField>

              <FormField
                label='Language code'
                description='Localized values will be written under valuesByLanguage[languageCode].'
              >
                <Input
                  variant='subtle'
                  size='sm'
                  value={localizedMerge.languageCode ?? ''}
                  placeholder='e.g. pl'
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    updateLocalizedMerge({ languageCode: e.target.value || undefined })
                  }
                 aria-label='e.g. pl' title='e.g. pl'/>
              </FormField>

              <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
                <span>Require full coverage</span>
                <Button
                  type='button'
                  variant={localizedMerge.requireFullCoverage ? 'success' : 'default'}
                  size='xs'
                  onClick={(): void =>
                    updateLocalizedMerge({
                      requireFullCoverage: !localizedMerge.requireFullCoverage,
                    })
                  }
                >
                  {localizedMerge.requireFullCoverage ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>
          )}
        </DatabaseSettingsSection>
      )}
    </div>
  );
}
