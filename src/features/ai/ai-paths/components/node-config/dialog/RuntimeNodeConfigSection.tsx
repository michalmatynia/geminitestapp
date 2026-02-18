'use client';

import type { NodeCacheMode } from '@/features/ai/ai-paths/lib';
import { Button, Input, SelectSimple, ToggleRow, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const cacheModeOptions = [
  { value: 'auto', label: 'Auto (deterministic only)' },
  { value: 'force', label: 'Force cache' },
  { value: 'disabled', label: 'Disable cache' },
];

export function RuntimeNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig, clearNodeCache } = useAiPathConfig();
  if (!selectedNode) return null;
  const runtimeConfig = selectedNode.config?.runtime ?? {};
  const cacheConfig = runtimeConfig.cache ?? {};
  const cacheMode: NodeCacheMode = cacheConfig.mode ?? 'auto';
  const cacheTtlSeconds = cacheConfig.ttlMs ? Math.round(cacheConfig.ttlMs / 1000) : '';
  const defaultWaitForInputs = selectedNode.type === 'database';
  const waitForInputs = runtimeConfig.waitForInputs ?? defaultWaitForInputs;

  return (
    <div className='space-y-3 rounded-md border border-border bg-card/50 p-3'>
      <FormField label='Execution cache'>
        <SelectSimple size='sm'
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
        Auto caching skips re-execution when inputs are unchanged within a run.
      </p>
      <p className='text-[11px] text-gray-500'>
        Disable cache to always re-run nodes that must execute every time (HTTP, DB writes, AI, delays, notifications).
      </p>
      <ToggleRow
        label='Require inputs'
        description='Wait for connected inputs to be present before execution.'
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
    </div>
  );
}
