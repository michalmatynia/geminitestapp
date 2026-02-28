'use client';

import type { NodeCacheMode, NodeCacheScope, NodeSideEffectPolicy } from '@/shared/lib/ai-paths';
import { Button, Input, MultiSelect, SelectSimple, ToggleRow, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const cacheModeOptions = [
  { value: 'auto', label: 'Auto (deterministic only)' },
  { value: 'force', label: 'Force cache' },
  { value: 'disabled', label: 'Disable cache' },
];

const cacheScopeOptions = [
  { value: 'run', label: 'Per run (default)' },
  { value: 'activation', label: 'Per activation/entity' },
  { value: 'session', label: 'Across session' },
];

const sideEffectPolicyOptions = [
  { value: 'per_run', label: 'Per run (default)' },
  { value: 'per_activation', label: 'Per activation (loop-aware)' },
];

const sideEffectNodeTypes = new Set<string>([
  'model',
  'agent',
  'learner_agent',
  'database',
  'http',
  'api_advanced',
  'notification',
  'delay',
  'poll',
  'db_schema',
  'description_updater',
]);

export function RuntimeNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig, clearNodeCache } = useAiPathConfig();
  if (!selectedNode) return null;
  const runtimeConfig = selectedNode.config?.runtime ?? {};
  const cacheConfig = runtimeConfig.cache ?? {};
  const retryConfig = runtimeConfig.retry ?? {};
  const cacheMode: NodeCacheMode = cacheConfig.mode ?? 'auto';
  const cacheScope: NodeCacheScope = cacheConfig.scope ?? 'run';
  const cacheTtlSeconds = cacheConfig.ttlMs ? Math.round(cacheConfig.ttlMs / 1000) : '';
  const defaultWaitForInputs = selectedNode.type === 'database';
  const waitForInputs = runtimeConfig.waitForInputs ?? defaultWaitForInputs;
  const timeoutMs = runtimeConfig.timeoutMs ?? '';
  const retryAttempts = retryConfig.attempts ?? '';
  const retryBackoffMs = retryConfig.backoffMs ?? '';
  const isSideEffectNode = sideEffectNodeTypes.has(selectedNode.type);
  const sideEffectPolicy: NodeSideEffectPolicy = runtimeConfig.sideEffectPolicy ?? 'per_run';
  const inputContracts = runtimeConfig.inputContracts ?? {};
  const inputPortOptions = selectedNode.inputs.map((port: string) => ({
    value: port,
    label: port,
  }));
  const requiredInputPorts = selectedNode.inputs.filter(
    (port: string): boolean => inputContracts[port]?.required === true
  );
  const optionalInputPorts = selectedNode.inputs.filter(
    (port: string): boolean => inputContracts[port]?.required === false
  );

  const buildInputContracts = (
    nextRequiredPorts: string[],
    nextOptionalPorts: string[]
  ): Record<string, { required?: boolean; cardinality?: 'single' | 'many' }> | undefined => {
    const requiredSet = new Set(nextRequiredPorts);
    const optionalSet = new Set(
      nextOptionalPorts.filter((port: string): boolean => !requiredSet.has(port))
    );
    const keys = new Set<string>([
      ...Object.keys(inputContracts),
      ...Array.from(requiredSet),
      ...Array.from(optionalSet),
    ]);

    const nextContracts: Record<string, { required?: boolean; cardinality?: 'single' | 'many' }> =
      {};
    keys.forEach((port: string): void => {
      const existing = inputContracts[port];
      const required = requiredSet.has(port) ? true : optionalSet.has(port) ? false : undefined;
      if (!existing && required === undefined) return;
      const cardinality = existing?.cardinality;
      if (required === undefined && cardinality === undefined) return;
      nextContracts[port] = {
        ...(required !== undefined ? { required } : {}),
        ...(cardinality ? { cardinality } : {}),
      };
    });
    return Object.keys(nextContracts).length > 0 ? nextContracts : undefined;
  };

  const updateInputContractSelections = (
    nextRequiredPorts: string[],
    nextOptionalPorts: string[]
  ): void => {
    updateSelectedNodeConfig({
      runtime: {
        ...runtimeConfig,
        inputContracts: buildInputContracts(nextRequiredPorts, nextOptionalPorts),
      },
    });
  };

  return (
    <div className='space-y-3 rounded-md border border-border bg-card/50 p-3'>
      <FormField label='Execution cache'>
        <SelectSimple
          size='sm'
          value={cacheMode}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              runtime: {
                ...runtimeConfig,
                cache: {
                  ...cacheConfig,
                  mode: value as NodeCacheMode,
                },
              },
            })
          }
          options={cacheModeOptions}
          placeholder='Cache mode'
          className='mt-2'
        />
      </FormField>
      {cacheMode !== 'disabled' && (
        <FormField
          label='Cache TTL (seconds)'
          description='How long cached outputs stay valid. Leave empty for no expiry.'
        >
          <Input
            type='number'
            min={0}
            placeholder='No expiry'
            value={cacheTtlSeconds}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
              const seconds = parseInt(e.target.value, 10);
              const ttlMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
              const { ttlMs: droppedTtlMs, ...cacheWithoutTtl } = cacheConfig;
              void droppedTtlMs;
              updateSelectedNodeConfig({
                runtime: {
                  ...runtimeConfig,
                  cache: ttlMs !== null ? { ...cacheWithoutTtl, ttlMs } : cacheWithoutTtl,
                },
              });
            }}
            className='mt-1 w-full border-border bg-card/70 text-sm text-white'
          />
        </FormField>
      )}
      {cacheMode !== 'disabled' && (
        <FormField
          label='Cache scope'
          description='Defines where cache keys are isolated: current run, current activation/entity, or full editor session.'
        >
          <SelectSimple
            size='sm'
            value={cacheScope}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                runtime: {
                  ...runtimeConfig,
                  cache: {
                    ...cacheConfig,
                    scope: value as NodeCacheScope,
                  },
                },
              })
            }
            options={cacheScopeOptions}
            className='mt-2'
          />
        </FormField>
      )}
      {cacheMode !== 'disabled' && clearNodeCache && (
        <Button
          variant='ghost'
          size='sm'
          className='h-7 text-[11px] text-gray-400 hover:text-white'
          onClick={(): void => clearNodeCache(selectedNode.id)}
        >
          Clear cached output
        </Button>
      )}
      <p className='text-[11px] text-gray-500'>
        Auto caching skips re-execution when inputs are unchanged under the selected cache scope.
      </p>
      <p className='text-[11px] text-gray-500'>
        Disable cache to always re-run nodes that must execute every time (HTTP, DB writes, AI,
        delays, notifications).
      </p>
      {isSideEffectNode && (
        <FormField
          label='Side-effect policy'
          description='Controls whether this node executes once per run or once per unique activation.'
        >
          <SelectSimple
            size='sm'
            value={sideEffectPolicy}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                runtime: {
                  ...runtimeConfig,
                  sideEffectPolicy: value as NodeSideEffectPolicy,
                },
              })
            }
            options={sideEffectPolicyOptions}
            className='mt-2'
          />
        </FormField>
      )}
      <ToggleRow
        label='Require inputs'
        description='Wait for required inputs before execution. If no required ports are set, all connected inputs are required.'
        checked={waitForInputs}
        onCheckedChange={(checked: boolean): void =>
          updateSelectedNodeConfig({
            runtime: {
              ...runtimeConfig,
              waitForInputs: checked,
            },
          })
        }
        className='mt-3 bg-transparent border-none p-0 hover:bg-transparent'
      />
      {selectedNode.inputs.length > 0 && (
        <div className='grid gap-3 sm:grid-cols-2'>
          <FormField
            label='Required input ports'
            description='Execution waits for these ports when "Require inputs" is enabled.'
          >
            <MultiSelect
              options={inputPortOptions}
              selected={requiredInputPorts}
              placeholder='All connected ports (default)'
              onChange={(values: string[]): void => {
                const dedupedOptional = optionalInputPorts.filter(
                  (port: string): boolean => !values.includes(port)
                );
                updateInputContractSelections(values, dedupedOptional);
              }}
            />
          </FormField>
          <FormField
            label='Optional input ports'
            description='Optional ports can be wired without blocking execution.'
          >
            <MultiSelect
              options={inputPortOptions}
              selected={optionalInputPorts}
              placeholder='No optional overrides'
              onChange={(values: string[]): void => {
                const dedupedOptional = values.filter(
                  (port: string): boolean => !requiredInputPorts.includes(port)
                );
                updateInputContractSelections(requiredInputPorts, dedupedOptional);
              }}
            />
          </FormField>
        </div>
      )}
      <FormField
        label='Execution timeout (ms)'
        description='Optional per-node timeout. Leave empty to use global runtime behavior.'
      >
        <Input
          type='number'
          min={0}
          placeholder='No timeout'
          value={timeoutMs}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = parseInt(event.target.value, 10);
            updateSelectedNodeConfig({
              runtime: {
                ...runtimeConfig,
                ...(Number.isFinite(parsed) && parsed > 0
                  ? { timeoutMs: parsed }
                  : { timeoutMs: undefined }),
              },
            });
          }}
          className='mt-1 w-full border-border bg-card/70 text-sm text-white'
        />
      </FormField>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Retry attempts' description='Total attempts including first execution.'>
          <Input
            type='number'
            min={1}
            placeholder='1'
            value={retryAttempts}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              const parsed = parseInt(event.target.value, 10);
              const nextRetry = {
                ...retryConfig,
                ...(Number.isFinite(parsed) && parsed > 0
                  ? { attempts: parsed }
                  : { attempts: undefined }),
              };
              updateSelectedNodeConfig({
                runtime: {
                  ...runtimeConfig,
                  retry: nextRetry,
                },
              });
            }}
            className='mt-1 w-full border-border bg-card/70 text-sm text-white'
          />
        </FormField>
        <FormField label='Retry backoff (ms)' description='Delay before each retry attempt.'>
          <Input
            type='number'
            min={0}
            placeholder='0'
            value={retryBackoffMs}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              const parsed = parseInt(event.target.value, 10);
              const nextRetry = {
                ...retryConfig,
                ...(Number.isFinite(parsed) && parsed >= 0
                  ? { backoffMs: parsed }
                  : { backoffMs: undefined }),
              };
              updateSelectedNodeConfig({
                runtime: {
                  ...runtimeConfig,
                  retry: nextRetry,
                },
              });
            }}
            className='mt-1 w-full border-border bg-card/70 text-sm text-white'
          />
        </FormField>
      </div>
    </div>
  );
}
