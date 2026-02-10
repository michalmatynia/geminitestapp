'use client';



import { toNumber } from '@/features/ai/ai-paths/lib';
import { Input, Label } from '@/shared/ui';
import { useAiPathConfig } from '../../AiPathConfigContext';

export function DelayNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (!selectedNode || selectedNode.type !== 'delay') return null;

  const delayConfig = selectedNode.config?.delay ?? { ms: 300 };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Delay (ms)</Label>
        <Input
          type='number'
          step='50'
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={delayConfig.ms}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              delay: {
                ms: toNumber(event.target.value, delayConfig.ms),
              },
            })
          }
        />
      </div>
      <p className='text-[11px] text-gray-500'>
        Adds a pause before passing inputs downstream.
      </p>
    </div>
  );
}
