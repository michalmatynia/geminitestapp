'use client';

import { useState } from 'react';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { FormModal, Alert, LoadingState } from '@/shared/ui';

import { BaseListingSettings } from './BaseListingSettings';
import { ExportLogViewer } from './ExportLogViewer';
import { useMassListForm } from './hooks/useMassListForm';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { MassListProductModalViewProvider, useMassListProductModalViewContext } from './mass-list-modal/context/MassListProductModalViewContext';

interface MassListProductModalProps extends EntityModalProps<string[]> {
  integrationId: string;
  connectionId: string;
}

function MassListProductModalContent(): React.JSX.Element {
  const {
    productIds,
    integrationId,
    connectionId,
    onClose,
    onSuccess,
  } = useMassListProductModalViewContext();
  const [logsOpen, setLogsOpen] = useState(false);

  const {
    loadingIntegrations: loading,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    selectedInventoryId,
    selectedTemplateId,
    allowDuplicateSku,
  } = useListingSettingsContext();

  const {
    error,
    progress,
    exportLogs,
    handleSubmit,
    submitting,
  } = useMassListForm({
    productIds,
    integrationId,
    connectionId,
    isBaseComIntegration,
    selectedConnectionId,
    selectedInventoryId,
    selectedTemplateId,
    allowDuplicateSku,
    onSuccess,
  });

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title={`List ${productIds.length} Products to ${selectedIntegration?.name || 'Marketplace'}`}
      onSave={(): void => { void handleSubmit(); }}
      isSaving={submitting}
      saveText={isBaseComIntegration ? 'Export to Base.com' : 'List Products'}
      cancelText='Cancel'
      size='md'
    >
      <div className='space-y-6'>
        {error && (
          <Alert variant='error'>
            {error}
          </Alert>
        )}

        {submitting && progress && (
          <div className='space-y-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm text-gray-300'>Processing {progress.current} of {progress.total}...</p>
              <LoadingState size='sm' className='p-0' />
            </div>
            <div className='h-2 w-full rounded-full bg-gray-800'>
              <div
                className='h-full rounded-full bg-primary transition-all duration-300'
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {progress.errors > 0 && <p className='text-xs text-red-400'>{progress.errors} failures so far</p>}
          </div>
        )}

        {!submitting && (
          <>
            <IntegrationAccountSummary />

            {loading ? (
              <LoadingState message='Loading details...' size='sm' className='py-4' />
            ) : (
              <>
                {isBaseComIntegration && <BaseListingSettings />}
              </>
            )}
          </>
        )}

        {exportLogs.length > 0 && (
          <div className='mt-4 border-t border pt-4'>
            <ExportLogViewer
              logs={exportLogs}
              isOpen={logsOpen}
              onToggle={setLogsOpen}
            />
          </div>
        )}
      </div>
    </FormModal>
  );
}

export function MassListProductModal(props: MassListProductModalProps): React.JSX.Element | null {
  const {
    isOpen,
    integrationId,
    connectionId,
    item: productIds,
    onClose,
    onSuccess,
  } = props;

  if (!productIds || !isOpen) return null;

  return (
    <ListingSettingsProvider
      initialIntegrationId={integrationId}
      initialConnectionId={connectionId}
    >
      <MassListProductModalViewProvider
        value={{
          productIds,
          integrationId,
          connectionId,
          onClose,
          onSuccess: onSuccess ?? (() => {}),
        }}
      >
        <MassListProductModalContent />
      </MassListProductModalViewProvider>
    </ListingSettingsProvider>
  );
}

export default MassListProductModal;
