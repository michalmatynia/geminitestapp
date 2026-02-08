'use client';

import type { AiNode, NodeCacheMode, NodeConfig } from '@/features/ai/ai-paths/lib';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@/shared/ui';

type RuntimeNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function RuntimeNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: RuntimeNodeConfigSectionProps): React.JSX.Element {
  const runtimeConfig = selectedNode.config?.runtime ?? {};
  const cacheConfig = runtimeConfig.cache ?? {};
  const cacheMode: NodeCacheMode = cacheConfig.mode ?? 'auto';
  const defaultWaitForInputs = selectedNode.type === 'database';
  const waitForInputs = runtimeConfig.waitForInputs ?? defaultWaitForInputs;

  return (
    <div className='space-y-3 rounded-md border border-border bg-card/50 p-3'>
      <div>
        <Label className='text-xs text-gray-400'>Execution cache</Label>
        <Select
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
        >
          <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
            <SelectValue placeholder='Cache mode' />
          </SelectTrigger>
          <SelectContent className='border-border bg-gray-900'>
            <SelectItem value='auto'>Auto (deterministic only)</SelectItem>
            <SelectItem value='force'>Force cache</SelectItem>
            <SelectItem value='disabled'>Disable cache</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className='text-[11px] text-gray-500'>
        Auto caching skips re-execution when inputs are unchanged within a run.
      </p>
      <p className='text-[11px] text-gray-500'>
        Disable cache to always re-run nodes that must execute every time (HTTP, DB writes, AI, delays, notifications).
      </p>
      <div className='mt-3 flex items-center justify-between gap-4'>
        <div>
          <div className='text-[11px] text-gray-200'>Require inputs</div>
          <div className='text-[11px] text-gray-500'>
            Wait for connected inputs to be present before execution.
          </div>
        </div>
        <Switch
          checked={waitForInputs}
          onCheckedChange={(checked: boolean): void =>
            updateSelectedNodeConfig({
              runtime: {
                ...runtimeConfig,
                waitForInputs: checked,
              },
            })
          }
        />
      </div>
    </div>
  );
}
