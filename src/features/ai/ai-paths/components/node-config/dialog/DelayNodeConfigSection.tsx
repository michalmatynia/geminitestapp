'use client';



import { toNumber } from '@/features/ai/ai-paths/lib';
import { Input, Label, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function DelayNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'delay') return null;

  const delayConfig = selectedNode.config?.delay ?? { ms: 300 };

  return (
    <div className='space-y-4'>
      <FormField label='Delay (ms)'>
        <Input
          type='number'
          step='50'
          variant='subtle'
          size='sm'
          value={delayConfig.ms}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              delay: {
                ms: toNumber(event.target.value, delayConfig.ms),
              },
            })
          }
        />
      </FormField>
      <p className='text-[11px] text-gray-500'>
        Adds a pause before passing inputs downstream.
      </p>
    </div>
  );
}
