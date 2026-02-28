'use client';

import React from 'react';

import { useIntegrationsTesting } from '@/features/integrations/context/integrations/IntegrationsTestingContext';
import type { ModalStateProps } from '@/shared/contracts/ui';
import { StatusBadge, MetadataItem, Hint, FormField, Card } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

interface TestLogModalProps extends Omit<ModalStateProps, 'onSuccess'> {
  onSuccess?: () => void;
  selectedStep?: {
    step: string | undefined;
    status: string | undefined;
    timestamp: string | undefined;
    detail?: string | undefined;
  };
}

export function TestLogModal({
  isOpen: isOpenProp,
  onClose: onCloseProp,
  selectedStep: selectedStepProp,
}: TestLogModalProps): React.JSX.Element | null {
  const testing = useIntegrationsTesting();

  const isOpen = isOpenProp ?? testing.showTestLogModal;
  const onClose = onCloseProp ?? (() => testing.setShowTestLogModal(false));
  const selectedStep = selectedStepProp ?? testing.selectedStep;

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
          <MetadataItem label='Operation' value={selectedStep.step ?? 'Unknown'} />
          <MetadataItem
            label='Execution Status'
            value={
              <StatusBadge
                status={selectedStep.status === 'ok' ? 'SUCCESS' : 'FAILED'}
                variant={selectedStep.status === 'ok' ? 'success' : 'error'}
                size='sm'
                className='font-bold'
              />
            }
          />
        </div>

        {selectedStep.detail && (
          <FormField label='Extended Details' className='ml-1'>
            <Card
              variant='subtle-compact'
              padding='md'
              className='border-border bg-gray-950 font-mono text-[11px] text-gray-300 leading-relaxed'
            >
              {selectedStep.detail}
            </Card>
          </FormField>
        )}

        <Hint
          variant='info'
          className='rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 italic'
        >
          {selectedStep.status === 'ok'
            ? 'The automated engine completed this task segment successfully and proceeded to the next instruction.'
            : 'The automated engine encountered an obstacle and terminated the process after this step.'}
        </Hint>
      </div>
    </DetailModal>
  );
}
