'use client';

import type { RouterConfig } from '@/shared/lib/ai-paths';
import { Input, Label, SelectSimple } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

export function RouterNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'router') return null;

  const routerConfig = selectedNode.config?.router ?? {
    mode: 'valid',
    matchMode: 'truthy',
    compareTo: '',
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Match Source</Label>
        <SelectSimple
          size='sm'
          value={routerConfig.mode}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              router: {
                ...routerConfig,
                mode: value as RouterConfig['mode'],
              },
            })
          }
          options={[
            { value: 'valid', label: 'Validator valid' },
            { value: 'value', label: 'Value input' },
          ]}
          placeholder='Select mode'
          triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Match Mode</Label>
        <SelectSimple
          size='sm'
          value={routerConfig.matchMode}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              router: {
                ...routerConfig,
                matchMode: value as RouterConfig['matchMode'],
              },
            })
          }
          options={[
            { value: 'truthy', label: 'Truthy' },
            { value: 'falsy', label: 'Falsy' },
            { value: 'equals', label: 'Equals' },
            { value: 'contains', label: 'Contains' },
          ]}
          placeholder='Select match mode'
          triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Compare To</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={routerConfig.compareTo}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              router: {
                ...routerConfig,
                compareTo: event.target.value,
              },
            })
          }
        />
      </div>
    </div>
  );
}
