'use client';

import { Button } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

export function AiDescriptionNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  if (selectedNode?.type !== 'ai_description') return null;

  const descriptionConfig = selectedNode.config?.description ?? {
    visionOutputEnabled: true,
    generationOutputEnabled: true,
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Include vision analysis</span>
        <Button
          type='button'
          variant={descriptionConfig.visionOutputEnabled ? 'success' : 'default'}
          size='xs'
          onClick={(): void =>
            updateSelectedNodeConfig({
              description: {
                ...descriptionConfig,
                visionOutputEnabled: !descriptionConfig.visionOutputEnabled,
              },
            })
          }
        >
          {descriptionConfig.visionOutputEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Include generation output</span>
        <Button
          type='button'
          variant={descriptionConfig.generationOutputEnabled ? 'success' : 'default'}
          size='xs'
          onClick={(): void =>
            updateSelectedNodeConfig({
              description: {
                ...descriptionConfig,
                generationOutputEnabled: !descriptionConfig.generationOutputEnabled,
              },
            })
          }
        >
          {descriptionConfig.generationOutputEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
    </div>
  );
}
