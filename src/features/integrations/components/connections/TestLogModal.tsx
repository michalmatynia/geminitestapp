'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { AppModal } from '@/shared/ui';

export function TestLogModal(): React.JSX.Element | null {
  const { selectedStep, setShowTestLogModal } = useIntegrationsContext();
  
  if (!selectedStep) return null;

  return (
    <AppModal
      open={true}
      onClose={() => setShowTestLogModal(false)}
      title='Playwright Log'
      size='md'
    >
      <div className='space-y-2 text-sm text-gray-300'>
        <p>
          <span className='text-gray-400'>Step:</span> {selectedStep.step}
        </p>
        <p>
          <span className='text-gray-400'>Status:</span>{' '}
          {selectedStep.status === 'ok' ? 'OK' : 'FAILED'}
        </p>
        <p>
          <span className='text-gray-400'>Time:</span>{' '}
          {new Date(selectedStep.timestamp).toLocaleString()}
        </p>
        {selectedStep.detail && (
          <p>
            <span className='text-gray-400'>Detail:</span>{' '}
            {selectedStep.detail}
          </p>
        )}
        <div className='rounded-md border border-border bg-card/60 p-3 text-xs text-gray-400'>
          {selectedStep.status === 'ok'
            ? 'Playwright completed this step successfully.'
            : 'Playwright stopped after this step due to a failure.'}
        </div>
      </div>
    </AppModal>
  );
}
