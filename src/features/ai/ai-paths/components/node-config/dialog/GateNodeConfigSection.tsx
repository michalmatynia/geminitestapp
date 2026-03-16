'use client';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { GateConfig } from '@/shared/lib/ai-paths';
import { Input, SelectSimple, FormField } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const GATE_MODE_OPTIONS = [
  { value: 'block', label: 'Block on invalid' },
  { value: 'pass', label: 'Pass-through' },
] as const satisfies ReadonlyArray<LabeledOptionDto<GateConfig['mode']>>;

export function GateNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'gate') return null;

  const gateConfig: GateConfig = selectedNode.config?.gate ?? {
    mode: 'block',
    failMessage: 'Gate blocked',
  };

  return (
    <div className='space-y-4'>
      <FormField label='Mode'>
        <SelectSimple
          size='sm'
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
          options={GATE_MODE_OPTIONS}
          placeholder='Select mode'
         ariaLabel='Select mode' title='Select mode'/>
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
         aria-label='Fail Message' title='Fail Message'/>
      </FormField>
    </div>
  );
}
