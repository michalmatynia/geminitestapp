'use client';

import { useRuntimeState } from '@/features/ai/ai-paths/context';
import { JsonViewer } from '@/shared/ui';


export function GraphModelDebugPanel(): React.JSX.Element {
  const { runtimeState: payload } = useRuntimeState();

  return (
    <div className='space-y-2'>
      <JsonViewer
        title='Runtime State Debug'
        data={payload}
        maxHeight='300px'
        className='bg-card/60'
      />
      {!payload && (
        <div className='text-[11px] text-gray-500 px-3'>
          Run a path to capture runtime debug payload.
        </div>
      )}
    </div>
  );
}
