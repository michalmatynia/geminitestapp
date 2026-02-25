'use client';

import type { ConstantConfig } from '@/features/ai/ai-paths/lib';
import { Input, Label, SelectSimple, Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const valueTypeOptions = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
];

export function ConstantNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'constant') return null;

  const constantConfig = selectedNode.config?.constant ?? {
    valueType: 'string',
    value: '',
  };
  const isJson = constantConfig.valueType === 'json';

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Value Type</Label>
        <SelectSimple size='sm'
          value={constantConfig.valueType}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              constant: {
                ...constantConfig,
                valueType: value as ConstantConfig['valueType'],
              },
            })
          }
          options={valueTypeOptions}
          placeholder='Select type'
          className='mt-2'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Value</Label>
        {isJson ? (
          <Textarea
            className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={constantConfig.value}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateSelectedNodeConfig({
                constant: { ...constantConfig, value: event.target.value },
              })
            }
          />
        ) : (
          <Input
            className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={constantConfig.value}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updateSelectedNodeConfig({
                constant: { ...constantConfig, value: event.target.value },
              })
            }
          />
        )}
      </div>
    </div>
  );
}
