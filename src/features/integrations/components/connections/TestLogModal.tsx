'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { StatusBadge, MetadataItem, Hint, FormField } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

interface TestLogModalProps extends Omit<ModalStateProps, 'onSuccess'> {
  onSuccess?: () => void;
  selectedStep: {
    step: string | undefined;
    status: string | undefined;
    timestamp: string | undefined;
    detail?: string | undefined;
  };
}

export function TestLogModal({
  isOpen,
  onClose,
  selectedStep,
}: TestLogModalProps): React.JSX.Element | null {
  if (!selectedStep) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Execution Step Log'
      subtitle={`Recorded at ${selectedStep.timestamp ? new Date(selectedStep.timestamp).toLocaleString() : 'Unknown'}`}
      size='md'
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <MetadataItem
            label='Operation'
            value={selectedStep.step ?? 'Unknown'}
          />
          <MetadataItem
            label='Execution Status'
            value={(
              <StatusBadge 
                status={selectedStep.status === 'ok' ? 'SUCCESS' : 'FAILED'} 
                variant={selectedStep.status === 'ok' ? 'success' : 'error'}
                size='sm'
                className='font-bold'
              />
            )}
          />
        </div>

        {selectedStep.detail && (
          <FormField label='Extended Details' className='ml-1'>
            <div className='rounded-lg border border-border bg-gray-950 p-4 font-mono text-[11px] text-gray-300 leading-relaxed'>
              {selectedStep.detail}
            </div>
          </FormField>
        )}

        <Hint variant='info' className='rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 italic'>
          {selectedStep.status === 'ok'
            ? 'The automated engine completed this task segment successfully and proceeded to the next instruction.'
            : 'The automated engine encountered an obstacle and terminated the process after this step.'}
        </Hint>
      </div>
    </DetailModal>
  );
}
