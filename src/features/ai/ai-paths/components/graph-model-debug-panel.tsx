'use client';

import { JsonViewer } from '@/shared/ui';

import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';

export function GraphModelDebugPanel(): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const payload = orchestrator.lastGraphModelPayload;

  return (
    <div className='space-y-2'>
      <JsonViewer
        title='Graph Model Debug'
        data={payload}
        maxHeight='300px'
        className='bg-card/60'
      />
      {!payload && (
        <div className='text-[11px] text-gray-500 px-3'>
          Run a model node to capture the latest payload.
        </div>
      )}
    </div>
  );
}
