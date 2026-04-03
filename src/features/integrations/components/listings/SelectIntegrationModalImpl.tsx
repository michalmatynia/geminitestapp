'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { FormModal } from '@/shared/ui';

import { ConnectedIntegrationSelector } from './ConnectedIntegrationSelector';
import { useIntegrationSelection } from './hooks/useIntegrationSelection';
import {
  resolveIntegrationSelectionEmptyStateCopy,
  resolveSelectIntegrationModalCopy,
} from './product-listings-copy';

export interface SelectIntegrationModalProps extends ModalStateProps {
  onSelect: (integrationId: string, connectionId: string) => void;
}

export default function SelectIntegrationModal(
  props: SelectIntegrationModalProps
): React.JSX.Element | null {
  const { isOpen, onClose, onSelect } = props;
  const { modalTitle, saveText } = resolveSelectIntegrationModalCopy();
  const { message: emptyStateMessage, setupLabel } = resolveIntegrationSelectionEmptyStateCopy({
    isScopedMarketplaceFlow: false,
    statusTargetLabel: 'integration',
  });

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
      title={modalTitle}
      size='md'
      onSave={handleContinue}
      saveText={saveText}
      isSaveDisabled={!selectedIntegrationId || !selectedConnectionId}
    >
      <div className='space-y-4'>
        <ConnectedIntegrationSelector
          integrations={integrations}
          loading={loading}
          selectedIntegrationId={selectedIntegrationId}
          selectedConnectionId={selectedConnectionId}
          setSelectedIntegrationId={setSelectedIntegrationId}
          setSelectedConnectionId={setSelectedConnectionId}
          emptyStateVariant='card-link'
          emptyStateMessage={emptyStateMessage}
          emptyStateSetupLabel={setupLabel}
          loadingVariant='inline-text'
          loadingClassName='text-sm text-muted-foreground'
        />
      </div>
    </FormModal>
  );
}
