'use client';

import Link from 'next/link';
import React from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { FormModal, IntegrationSelector } from '@/shared/ui';

import { useIntegrationSelection } from './hooks/useIntegrationSelection';
import {
  resolveIntegrationSelectionEmptyStateCopy,
  resolveIntegrationSelectionLoadingMessage,
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
        {loading ? (
          <p className='text-sm text-muted-foreground'>
            {resolveIntegrationSelectionLoadingMessage()}
          </p>
        ) : integrations.length === 0 ? (
          <div className='rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-6 text-center'>
            <p className='text-sm text-yellow-200'>{emptyStateMessage.replace(/\.$/, '')}</p>
            <p className='mt-2 text-xs text-yellow-300/70'>
              <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
                {setupLabel} first
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
