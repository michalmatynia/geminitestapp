'use client';




import type { AiNode, MathConfig, NodeConfig } from '@/features/ai/ai-paths/lib';
import { toNumber } from '@/features/ai/ai-paths/lib';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';

type MathNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function MathNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: MathNodeConfigSectionProps): React.JSX.Element | null {
  if (selectedNode.type !== 'math') return null;

  const mathConfig = selectedNode.config?.math ?? {
    operation: 'add',
    operand: 0,
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Operation</Label>
        <Select
          value={mathConfig.operation}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              math: {
                ...mathConfig,
                operation: value as MathConfig['operation'],
              },
            })
          }
        >
          <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
            <SelectValue placeholder='Select operation' />
          </SelectTrigger>
          <SelectContent className='border-border bg-gray-900'>
            <SelectItem value='add'>Add</SelectItem>
            <SelectItem value='subtract'>Subtract</SelectItem>
            <SelectItem value='multiply'>Multiply</SelectItem>
            <SelectItem value='divide'>Divide</SelectItem>
            <SelectItem value='round'>Round</SelectItem>
            <SelectItem value='ceil'>Ceil</SelectItem>
            <SelectItem value='floor'>Floor</SelectItem>
          </SelectContent>
        </Select>
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
