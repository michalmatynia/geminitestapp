'use client';

import type { CompareConfig } from '@/shared/lib/ai-paths';
import { Button, Input,  SelectSimple, FormField } from '@/shared/ui';

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

  if (selectedNode?.type !== 'compare') return null;

  const compareConfig = selectedNode.config?.compare ?? {
    operator: 'eq',
    compareTo: '',
    caseSensitive: false,
    message: 'Comparison failed',
  };

  return (
    <div className='space-y-4'>
      <FormField label='Operator'>
        <SelectSimple size='sm'
          variant='subtle'
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
        />
      </FormField>
      <FormField label='Compare To'>
        <Input
          variant='subtle'
          size='sm'
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
      </FormField>
      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Case Sensitive</span>
        <Button
          type='button'
          variant={compareConfig.caseSensitive ? 'success' : 'default'}
          size='xs'
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
      <FormField label='Error Message'>
        <Input
          variant='subtle'
          size='sm'
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
      </FormField>
    </div>
  );
}
