'use client';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { MathConfig } from '@/shared/lib/ai-paths';
import { toNumber } from '@/shared/lib/ai-paths';
import { Input, SelectSimple, FormField } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const operationOptions: Array<LabeledOptionDto<NonNullable<MathConfig['operation']>>> = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'divide', label: 'Divide' },
  { value: 'round', label: 'Round' },
  { value: 'ceil', label: 'Ceil' },
  { value: 'floor', label: 'Floor' },
];

export function MathNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'math') return null;

  const mathConfig = selectedNode.config?.math ?? {
    operation: 'add',
    operand: 0,
  };

  return (
    <div className='space-y-4'>
      <FormField label='Operation'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={mathConfig.operation}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              math: {
                ...mathConfig,
                operation: value as MathConfig['operation'],
              },
            })
          }
          options={operationOptions}
          placeholder='Select operation'
         ariaLabel='Select operation' title='Select operation'/>
      </FormField>
      <FormField label='Operand'>
        <Input
          type='number'
          step='0.1'
          variant='subtle'
          size='sm'
          value={mathConfig.operand}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              math: {
                ...mathConfig,
                operand: toNumber(event.target.value, mathConfig.operand ?? 0),
              },
            })
          }
         aria-label='Operand' title='Operand'/>
      </FormField>
    </div>
  );
}
