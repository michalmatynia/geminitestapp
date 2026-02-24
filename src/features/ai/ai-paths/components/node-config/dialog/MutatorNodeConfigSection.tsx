'use client';

import { Input,  Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function MutatorNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'mutator') return null;

  const mutatorConfig = selectedNode.config?.mutator ?? {
    path: 'entity.title',
    valueTemplate: '{{value}}',
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Target Path</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={mutatorConfig.path}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              mutator: { ...mutatorConfig, path: event.target.value },
            })
          }
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Value Template</Label>
        <Textarea
          className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={mutatorConfig.valueTemplate}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              mutator: {
                ...mutatorConfig,
                valueTemplate: event.target.value,
              },
            })
          }
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          Use <span className='text-gray-300'>{'{{value}}'}</span> for the
          current value or dot paths like{' '}
          <span className='text-gray-300'>{'{{entity.title}}'}</span>.
        </p>
      </div>
    </div>
  );
}
