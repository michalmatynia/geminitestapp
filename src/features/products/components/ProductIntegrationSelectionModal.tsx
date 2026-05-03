'use client';

import Link from 'next/link';
import React, { useCallback } from 'react';

import { FormModal } from '@/shared/ui/FormModal';
import { IntegrationSelector } from '@/shared/ui/integration-selector';
import { useIntegrationSelection } from '../hooks/useIntegrationSelection';

export function ProductIntegrationSelectionModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (integrationId: string, connectionId: string) => void;
}): React.JSX.Element | null {
  const { isOpen, onClose, onSelect } = props;
  const state = useIntegrationSelection({ isOpen });

  const handleContinue = useCallback((): void => {
    if (state.selectedIntegrationId !== '' && state.selectedConnectionId !== '') {
      onSelect(state.selectedIntegrationId, state.selectedConnectionId);
    }
  }, [onSelect, state.selectedConnectionId, state.selectedIntegrationId]);

  if (isOpen === false) return null;

  let content: React.ReactNode;
  if (state.isLoading === true) {
    content = <p className='text-sm text-muted-foreground'>Loading integrations...</p>;
  } else if (state.integrations.length === 0) {
    content = (
      <div className='rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-6 text-center'>
        <p className='text-sm text-yellow-200'>No connected integrations</p>
        <p className='mt-2 text-xs text-yellow-300/70'>
          <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
            Set up an integration first
          </Link>
        </p>
      </div>
    );
  } else {
    content = (
      <IntegrationSelector
        integrations={state.integrations}
        selectedIntegrationId={state.selectedIntegrationId}
        onIntegrationChange={state.setSelectedIntegrationId}
        selectedConnectionId={state.selectedConnectionId}
        onConnectionChange={state.setSelectedConnectionId}
      />
    );
  }

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Select Marketplace / Integration'
      size='md'
      onSave={handleContinue}
      saveText='Continue'
      isSaveDisabled={state.selectedIntegrationId === '' || state.selectedConnectionId === ''}
    >
      <div className='space-y-4'>{content}</div>
    </FormModal>
  );
}
