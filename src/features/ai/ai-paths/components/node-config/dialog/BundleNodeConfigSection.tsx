'use client';

import { parsePathList } from '@/shared/lib/ai-paths/core/utils';
import { Button, Textarea } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

export function BundleNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

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
         aria-label='Included Ports (one per line)' title='Included Ports (one per line)'/>
      </FormField>
    </div>
  );
}
