'use client';

import React from 'react';
import Link from 'next/link';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { FormModal, IntegrationSelector } from '@/shared/ui';

import { useIntegrationSelection } from './hooks/useIntegrationSelection';

export interface SelectIntegrationModalProps extends ModalStateProps {
  onSelect: (integrationId: string, connectionId: string) => void;
}

export default function SelectIntegrationModal({
  isOpen,
  onClose,
  onSelect,
}: SelectIntegrationModalProps): React.JSX.Element | null {
  const {
    integrations,
    loading,
    selectedIntegrationId,
    selectedConnectionId,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection();

  const handleContinue = (): void => {
    if (selectedIntegrationId && selectedConnectionId) {
      onSelect(selectedIntegrationId, selectedConnectionId);
    }
  };

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Select Marketplace / Integration'
      size='md'
      onSave={handleContinue}
      saveText='Continue'
      isSaveDisabled={!selectedIntegrationId || !selectedConnectionId}
    >
      <div className='space-y-4'>
        {loading ? (
          <p className='text-sm text-muted-foreground'>Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <div className='rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-6 text-center'>
            <p className='text-sm text-yellow-200'>No connected integrations</p>
            <p className='mt-2 text-xs text-yellow-300/70'>
              <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
                Set up an integration first
              </Link>
            </p>
          </div>
        ) : (
          <IntegrationSelector
            integrations={integrations}
            selectedIntegrationId={selectedIntegrationId}
            onIntegrationChange={setSelectedIntegrationId}
            selectedConnectionId={selectedConnectionId}
            onConnectionChange={setSelectedConnectionId}
          />
        )}
      </div>
    </FormModal>
  );
}
