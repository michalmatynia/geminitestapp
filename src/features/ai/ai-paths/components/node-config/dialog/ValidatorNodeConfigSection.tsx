'use client';

import { parsePathList } from '@/features/ai/ai-paths/lib';
import { Label, Textarea, SelectSimple } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const validationModeOptions = [
  { value: 'all', label: 'All paths required' },
  { value: 'any', label: 'Any path required' },
];

export function ValidatorNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'validator') return null;

  const validatorConfig = selectedNode.config?.validator ?? {
    requiredPaths: ['entity.id'],
    mode: 'all',
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Validation Mode</Label>
        <SelectSimple size='sm'
          value={validatorConfig.mode}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              validator: {
                ...validatorConfig,
                mode: value as 'all' | 'any',
              },
            })
          }
          options={validationModeOptions}
          placeholder='Select mode'
          className='mt-2'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>
          Required Paths (one per line)
        </Label>
        <Textarea
          className='mt-2 min-h-[100px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={(validatorConfig.requiredPaths ?? []).join('\n')}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              validator: {
                ...validatorConfig,
                requiredPaths: parsePathList(event.target.value),
              },
            })
          }
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          Paths are relative to the incoming context object.
        </p>
      </div>
    </div>
  );
}
