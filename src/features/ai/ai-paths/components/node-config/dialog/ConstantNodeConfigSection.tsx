'use client';





import type { ConstantConfig } from '@/features/ai/ai-paths/lib';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function ConstantNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (!selectedNode || selectedNode.type !== 'constant') return null;

  const constantConfig = selectedNode.config?.constant ?? {
    valueType: 'string',
    value: '',
  };
  const isJson = constantConfig.valueType === 'json';

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Value Type</Label>
        <Select
          value={constantConfig.valueType}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              constant: {
                ...constantConfig,
                valueType: value as ConstantConfig['valueType'],
              },
            })
          }
        >
          <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
            <SelectValue placeholder='Select type' />
          </SelectTrigger>
          <SelectContent className='border-border bg-gray-900'>
            <SelectItem value='string'>String</SelectItem>
            <SelectItem value='number'>Number</SelectItem>
            <SelectItem value='boolean'>Boolean</SelectItem>
            <SelectItem value='json'>JSON</SelectItem>
          </SelectContent>
        </Select>
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
