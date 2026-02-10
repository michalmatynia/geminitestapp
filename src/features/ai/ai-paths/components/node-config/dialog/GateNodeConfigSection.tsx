'use client';




import type { GateConfig } from '@/features/ai/ai-paths/lib';
import { Input, Label, UnifiedSelect } from '@/shared/ui';
import { useAiPathConfig } from '../../AiPathConfigContext';

export function GateNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (!selectedNode || selectedNode.type !== 'gate') return null;

  const gateConfig: GateConfig = selectedNode.config?.gate ?? {
    mode: 'block',
    failMessage: 'Gate blocked',
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Mode</Label>
        <UnifiedSelect
          value={gateConfig.mode}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              gate: {
                ...gateConfig,
                mode: value as GateConfig['mode'],
              },
            })
          }
          options={[
            { value: 'block', label: 'Block on invalid' },
            { value: 'pass', label: 'Pass-through' }
          ]}
          placeholder='Select mode'
          triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Fail Message</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={gateConfig.failMessage ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              gate: { ...gateConfig, failMessage: event.target.value },
            })
          }
        />
      </div>
    </div>
  );
}
