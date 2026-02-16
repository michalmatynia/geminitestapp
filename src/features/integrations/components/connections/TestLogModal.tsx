'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { DetailModal } from '@/shared/ui/templates/modals';
import { StatusBadge } from '@/shared/ui';

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
  if (!selectedStep) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Execution Step Log'
      subtitle={`Recorded at ${new Date(selectedStep.timestamp).toLocaleString()}`}
      size='md'
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-4 rounded-lg border border-border bg-card/40 p-4'>
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Operation</p>
            <p className='text-sm font-medium text-gray-200'>{selectedStep.step}</p>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Execution Status</p>
            <StatusBadge 
              status={selectedStep.status === 'ok' ? 'SUCCESS' : 'FAILED'} 
              variant={selectedStep.status === 'ok' ? 'success' : 'error'}
              size='sm'
              className='font-bold'
            />
          </div>
        </div>

        {selectedStep.detail && (
          <div className='space-y-1.5'>
            <p className='text-[10px] uppercase font-bold text-gray-500 ml-1'>Extended Details</p>
            <div className='rounded-lg border border-border bg-gray-950 p-4 font-mono text-[11px] text-gray-300 leading-relaxed'>
              {selectedStep.detail}
            </div>
          </div>
        )}

        <div className='rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300/80 leading-relaxed italic'>
          {selectedStep.status === 'ok'
            ? 'The automated engine completed this task segment successfully and proceeded to the next instruction.'
            : 'The automated engine encountered an obstacle and terminated the process after this step.'}
        </div>
      </div>
    </DetailModal>
  );
}
