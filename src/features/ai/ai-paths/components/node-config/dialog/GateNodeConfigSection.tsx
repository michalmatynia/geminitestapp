'use client';




import type { GateConfig } from '@/features/ai/ai-paths/lib';
import { Input,  SelectSimple, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function GateNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'gate') return null;

  const gateConfig: GateConfig = selectedNode.config?.gate ?? {
    mode: 'block',
    failMessage: 'Gate blocked',
  };

  return (
    <div className='space-y-4'>
      <FormField label='Mode'>
        <SelectSimple size='sm'
          variant='subtle'
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
        />
      </FormField>
      
      <FormField label='Fail Message'>
        <Input
          variant='subtle'
          size='sm'
          value={gateConfig.failMessage ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              gate: { ...gateConfig, failMessage: event.target.value },
            })
          }
        />
      </FormField>
    </div>
  );
}
