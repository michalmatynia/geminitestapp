'use client';

import type { MathConfig } from '@/features/ai/ai-paths/lib';
import { toNumber } from '@/features/ai/ai-paths/lib';
import { Input, Label, UnifiedSelect } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const operationOptions = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'divide', label: 'Divide' },
  { value: 'round', label: 'Round' },
  { value: 'ceil', label: 'Ceil' },
  { value: 'floor', label: 'Floor' },
];

export function MathNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (!selectedNode || selectedNode.type !== 'math') return null;

  const mathConfig = selectedNode.config?.math ?? {
    operation: 'add',
    operand: 0,
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Operation</Label>
        <UnifiedSelect
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
          className='mt-2'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Operand</Label>
        <Input
          type='number'
          step='0.1'
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={mathConfig.operand}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              math: {
                ...mathConfig,
                operand: toNumber(event.target.value, mathConfig.operand),
              },
            })
          }
        />
      </div>
    </div>
  );
}
