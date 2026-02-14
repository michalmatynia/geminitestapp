'use client';

import type { CompareConfig } from '@/features/ai/ai-paths/lib';
import { Button, Input, Label, SelectSimple } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const operatorOptions = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'isEmpty', label: 'Is empty' },
  { value: 'notEmpty', label: 'Not empty' },
];

export function CompareNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (!selectedNode || selectedNode.type !== 'compare') return null;

  const compareConfig = selectedNode.config?.compare ?? {
    operator: 'eq',
    compareTo: '',
    caseSensitive: false,
    message: 'Comparison failed',
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Operator</Label>
        <SelectSimple size='sm'
          value={compareConfig.operator}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                operator: value as CompareConfig['operator'],
              },
            })
          }
          options={operatorOptions}
          placeholder='Select operator'
          className='mt-2'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Compare To</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={compareConfig.compareTo}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                compareTo: event.target.value,
              },
            })
          }
        />
      </div>
      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Case Sensitive</span>
        <Button
          type='button'
          className={`rounded border px-3 py-1 text-xs ${
            compareConfig.caseSensitive
              ? 'text-emerald-200 hover:bg-emerald-500/10'
              : 'text-gray-300 hover:bg-muted/50'
          }`}
          onClick={(): void =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                caseSensitive: !compareConfig.caseSensitive,
              },
            })
          }
        >
          {compareConfig.caseSensitive ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Error Message</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={compareConfig.message ?? 'Comparison failed'}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                message: event.target.value,
              },
            })
          }
        />
      </div>
    </div>
  );
}
