'use client';




import { parsePathList } from '@/features/ai/ai-paths/lib';
import { Button,  Textarea, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function BundleNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'bundle') return null;

  const bundleConfig = selectedNode.config?.bundle ?? {
    includePorts: [],
  };

  return (
    <div className='space-y-4'>
      <FormField 
        label='Included Ports (one per line)' 
        description='Bundle outputs a single object with the selected ports as keys.'
        actions={
          <Button
            type='button'
            variant='outline'
            size='xs'
            className='h-7'
            onClick={(): void =>
              updateSelectedNodeConfig({
                bundle: { includePorts: selectedNode.inputs },
              })
            }
          >
            Use all inputs
          </Button>
        }
      >
        <Textarea
          variant='subtle'
          size='sm'
          className='min-h-[110px]'
          value={(bundleConfig.includePorts ?? []).join('\n')}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              bundle: { includePorts: parsePathList(event.target.value) },
            })
          }
        />
      </FormField>
    </div>
  );
}
