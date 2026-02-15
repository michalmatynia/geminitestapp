'use client';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { ContentDisplayModal } from '@/shared/ui/templates';

interface TestLogModalProps extends Omit<ModalStateProps, 'onSuccess'> {
  onSuccess?: () => void;
  selectedStep: {
    step: string;
    status: string;
    timestamp: string;
    detail?: string;
  };
}

export function TestLogModal({
  isOpen,
  onClose,
  selectedStep,
}: TestLogModalProps): React.JSX.Element | null {
  if (!isOpen || !selectedStep) return null;

  return (
    <ContentDisplayModal
      open={isOpen}
      onClose={onClose}
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
    </ContentDisplayModal>
  );
}
