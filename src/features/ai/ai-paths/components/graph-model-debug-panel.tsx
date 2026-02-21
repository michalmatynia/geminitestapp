'use client';

import { Card } from '@/shared/ui';

import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';

export function GraphModelDebugPanel(): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const payload = orchestrator.lastGraphModelPayload;

  return (
    <Card variant='subtle' padding='md' className='bg-card/60'>
      <div className='mb-2 text-sm font-semibold text-white'>Graph Model Debug</div>
      {payload ? (
        <pre className='max-h-60 overflow-auto rounded-md border border-border bg-card/70 p-3 text-[11px] text-gray-300 whitespace-pre-wrap'>
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : (
        <div className='text-[11px] text-gray-500'>
          Run a model node to capture the latest payload.
        </div>
      )}
    </Card>
  );
}
